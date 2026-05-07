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
        const [pr, mem] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/members`),
        ])
        if (!cancelled) {
          setProject(pr.data.data)
          setMembers(mem.data.data || [])
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
    <div className="max-w-5xl animate-in fade-in duration-300">
      <p className="text-xs text-gray-500">
        <Link to="/projects" className="hover:text-[#78e5ef]">Projects</Link>
        <span className="mx-2">›</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-[#78e5ef]">{project?.name ?? '…'}</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-300">Create issue</span>
      </p>
      <h1 className="text-2xl font-bold text-white mt-4 mb-8">Create New Issue</h1>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#78e5ef]/60">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="mt-2 w-full text-lg font-medium bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#78e5ef]/60">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue…"
              rows={12}
              className="mt-2 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef] resize-y min-h-[200px]"
            />
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-5 h-fit">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Project</p>
            <p className="text-sm text-white font-medium">{project?.name ?? '…'}</p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
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
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
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
                className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#78e5ef] text-[#042124] font-semibold text-sm hover:bg-[#9eedf3] disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Issue'}
            </button>
            <Link
              to={`/projects/${projectId}/board`}
              className="w-full text-center py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
