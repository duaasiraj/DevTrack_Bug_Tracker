import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { ISSUE_PRIORITIES, ISSUE_TYPES } from '../constants/issueEnums'
import { canAssignIssue } from '../utils/issuePermissions'
import { setLastProjectId } from '../hooks/useLastProjectId'

export default function IssueCreatePage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('task')
  const [priority, setPriority] = useState('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [projectLabels, setProjectLabels] = useState([])
  const [selectedLabelIds, setSelectedLabelIds] = useState(() => new Set())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLastProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const [pr, mem, lbl] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/members`),
          api.get(`/projects/${projectId}/labels`).catch(() => ({ data: { data: [] } })),
        ])
        if (!cancelled) {
          setProject(pr.data.data)
          setMembers(mem.data.data || [])
          setProjectLabels(lbl.data.data || [])
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load project')
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    try {
      const createRes = await api.post('/issues/', {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        label_ids: selectedLabelIds.size ? [...selectedLabelIds] : undefined,
      })
      const newIssue = createRes.data.data
      if (newIssue?.issue_id && assigneeId && canAssignIssue(user)) {
        try {
          await api.patch(`/issues/${newIssue.issue_id}/assign`, { assigned_to: assigneeId })
        } catch (assignErr) {
          setError(
            assignErr.response?.data?.message ||
              'Issue created but assignment failed. You can assign it from the issue page.',
          )
          navigate(`/projects/${projectId}/issues/${newIssue.issue_id}`)
          return
        }
      }
      navigate(`/projects/${projectId}/issues/${newIssue.issue_id}`)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not create issue')
    } finally {
      setSubmitting(false)
    }
  }

  const showAssign = canAssignIssue(user)

  return (
    <div className="max-w-5xl dt-animate-in pb-8">
      <p className="text-xs text-gray-500">
        <Link to="/projects" className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5">
          Projects
        </Link>
        <span className="mx-2 text-gray-600">›</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5">
          {project?.name ?? '…'}
        </Link>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-gray-300">Create issue</span>
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-8 tracking-tight">Create new issue</h1>

      {error && (
        <p className="mb-4 text-sm text-red-200 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 leading-relaxed">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/25 p-5 sm:p-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#78e5ef]/60 font-semibold">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="mt-2 w-full text-lg font-medium bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]/45 focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25 transition-shadow"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#78e5ef]/60 font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue…"
              rows={12}
              className="mt-2 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]/45 focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25 resize-y min-h-[200px] transition-shadow"
            />
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-5 sm:p-6 h-fit shadow-lg shadow-black/20 lg:sticky lg:top-24">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Project</p>
            <p className="text-sm text-white font-medium">{project?.name ?? '…'}</p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {showAssign && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.username}</option>
                ))}
              </select>
            </div>
          )}

          {projectLabels.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Labels</p>
              <ul className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-[#d2f5fa]/10 p-2 bg-[#042124]/50">
                {projectLabels.map((lb) => (
                  <li key={lb.label_id}>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.has(lb.label_id)}
                        onChange={() => {
                          setSelectedLabelIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(lb.label_id)) next.delete(lb.label_id)
                            else next.add(lb.label_id)
                            return next
                          })
                        }}
                        className="rounded border-[#78e5ef]/40 text-[#78e5ef] focus:ring-[#78e5ef]/30"
                      />
                      <span
                        className="truncate flex-1"
                        style={{ color: lb.color_hex || undefined }}
                      >
                        {lb.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#78e5ef] text-[#042124] font-semibold text-sm hover:bg-[#9eedf3] transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
            >
              {submitting ? 'Creating…' : 'Create issue'}
            </button>
            <Link
              to={`/projects/${projectId}/board`}
              className="w-full text-center py-2.5 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
