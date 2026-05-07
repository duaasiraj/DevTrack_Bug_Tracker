import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  priorityLabel,
  statusLabel,
} from '../constants/issueEnums'
import {
  canAssignIssue,
  canEditIssueFields,
  canSetClosedStatus,
  developerCanViewIssue,
  getSelectableStatuses,
} from '../utils/issuePermissions'
import { formatIssueKey, priorityTone } from '../utils/issueDisplay'
import { setLastProjectId } from '../hooks/useLastProjectId'

function formatCommentTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function IssueDetailPage() {
  const { projectId, issueId } = useParams()
  const { user } = useAuth()
  const [issue, setIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [history, setHistory] = useState([])
  const [members, setMembers] = useState([])
  const [project, setProject] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [tab, setTab] = useState('comments')
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function refreshIssueAndProject() {
    if (!issueId || !projectId) return
    setLoadError('')
    try {
      const [issueRes, projRes] = await Promise.all([
        api.get(`/issues/${issueId}`),
        api.get(`/projects/${projectId}`),
      ])
      setIssue(issueRes.data.data)
      setProject(projRes.data.data)
    } catch (e) {
      setLoadError(e.response?.data?.message || e.message || 'Failed to load issue')
      setIssue(null)
    }
  }

  async function refreshComments() {
    if (!issueId) return
    try {
      const r = await api.get(`/issues/${issueId}/comments`)
      setComments(r.data.data || [])
    } catch {
      setComments([])
    }
  }

  async function refreshHistory() {
    if (!issueId) return
    try {
      const r = await api.get(`/issues/${issueId}/history`)
      setHistory(r.data.data || [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    setLastProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!issueId || !projectId) return
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoadError('')
      try {
        const [issueRes, projRes, cRes, hRes, mRes] = await Promise.all([
          api.get(`/issues/${issueId}`),
          api.get(`/projects/${projectId}`),
          api.get(`/issues/${issueId}/comments`),
          api.get(`/issues/${issueId}/history`),
          api.get(`/projects/${projectId}/members`),
        ])
        if (cancelled) return
        setIssue(issueRes.data.data)
        setProject(projRes.data.data)
        setComments(cRes.data.data || [])
        setHistory(hRes.data.data || [])
        setMembers(mRes.data.data || [])
      } catch (e) {
        if (cancelled) return
        setLoadError(e.response?.data?.message || e.message || 'Failed to load issue')
        setIssue(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [issueId, projectId])

  async function postComment(e) {
    e.preventDefault()
    setActionError('')
    if (!commentText.trim()) return
    try {
      await api.post(`/issues/${issueId}/comments`, { content: commentText.trim() })
      setCommentText('')
      await refreshComments()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Could not add comment')
    }
  }

  async function patchIssue(body) {
    setActionError('')
    setSaving(true)
    try {
      await api.patch(`/issues/${issueId}`, body)
      await refreshIssueAndProject()
      await refreshHistory()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdits(e) {
    e.preventDefault()
    if (!canEditIssueFields(user, issue)) return
    await patchIssue({
      title: draftTitle.trim() || issue.title,
      description: draftDescription,
    })
    setEditing(false)
  }

  async function assignToUser(uid) {
    if (!uid) return
    setActionError('')
    try {
      await api.patch(`/issues/${issueId}/assign`, { assigned_to: uid })
      await refreshIssueAndProject()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Assignment failed')
    }
  }

  async function deleteComment(cid) {
    if (!window.confirm('Delete this comment?')) return
    setActionError('')
    try {
      await api.delete(`/issues/${issueId}/comments/${cid}`)
      await refreshComments()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Could not delete comment')
    }
  }

  if (loadError && !issue) {
    return (
      <div className="space-y-4">
        <p className="text-red-400 text-sm">{loadError}</p>
        <Link to={`/projects/${projectId}/board`} className="text-[#78e5ef] text-sm underline">Back to board</Link>
      </div>
    )
  }

  if (!issue || !user) {
    return <div className="text-gray-400 text-sm">Loading…</div>
  }

  if (user.role === 'developer' && !developerCanViewIssue(user.user_id, issue)) {
    return <Navigate to={`/projects/${projectId}/board`} replace />
  }

  const editable = canEditIssueFields(user, issue)
  const allowedStatuses = getSelectableStatuses(user.role, issue.status)

  return (
    <div className="max-w-6xl animate-in fade-in duration-300">
      <p className="text-xs text-gray-500">
        <Link to="/projects" className="hover:text-[#78e5ef]">Projects</Link>
        <span className="mx-2">›</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-[#78e5ef]">{project?.name ?? '…'}</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-300">{formatIssueKey(issue.issue_id)}</span>
      </p>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-2xl font-bold text-white flex-1 pr-4">{issue.title}</h1>
        <div className="flex gap-2 shrink-0">
          {editable && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraftTitle(issue.title || '')
                setDraftDescription(issue.description || '')
                setEditing(true)
              }}
              className="px-4 py-2 rounded-lg border border-[#78e5ef]/40 text-sm text-[#78e5ef] hover:bg-[#78e5ef]/10"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mt-4 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">{actionError}</p>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            <form onSubmit={saveEdits} className="space-y-4 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 p-5">
              <div>
                <label className="text-[10px] uppercase text-gray-500">Title</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500">Description</label>
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={10}
                  className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-white text-sm resize-y"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#78e5ef] text-[#042124] text-sm font-semibold disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setDraftTitle(issue.title || '')
                    setDraftDescription(issue.description || '')
                  }}
                  className="px-4 py-2 text-sm text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 p-6">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {issue.description?.trim() ? issue.description : <span className="text-gray-500">No description.</span>}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#0b1117]/60 overflow-hidden">
            <div className="flex border-b border-[#d2f5fa]/10">
              {['comments', 'history'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`px-4 py-3 text-sm capitalize ${
                    tab === k ? 'text-[#78e5ef] border-b-2 border-[#78e5ef]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="p-5">
              {tab === 'comments' && (
                <div className="space-y-6">
                  <ul className="space-y-4">
                    {comments.map((c) => (
                      <li key={c.comment_id} className="flex gap-3 border-b border-[#d2f5fa]/5 pb-4 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-[#78e5ef]/20 flex items-center justify-center text-xs text-[#78e5ef] font-semibold shrink-0">
                          {c.username?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-white">{c.username}</span>
                            <span className="text-xs text-gray-500">{formatCommentTime(c.created_at)}</span>
                            {(user.role === 'admin' || c.user_id === user.user_id) && (
                              <button
                                type="button"
                                onClick={() => deleteComment(c.comment_id)}
                                className="text-[10px] text-red-400 hover:underline ml-auto"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={postComment} className="space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment…"
                      rows={4}
                      className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#78e5ef]/20 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/30"
                    >
                      Comment
                    </button>
                  </form>
                </div>
              )}
              {tab === 'history' && (
                <ul className="space-y-3 text-sm">
                  {history.length === 0 ? (
                    <li className="text-gray-500">No status changes yet.</li>
                  ) : (
                    history.map((h) => (
                      <li key={h.history_id} className="text-gray-300 border-b border-[#d2f5fa]/5 pb-2">
                        <span className="text-[#78e5ef]/80">{h.changed_by_username ?? 'Someone'}</span>
                        {' '}
                        moved status from <span className="text-white">{statusLabel(h.old_status)}</span>
                        {' → '}
                        <span className="text-white">{statusLabel(h.new_status)}</span>
                        <span className="text-gray-500 text-xs ml-2">{formatCommentTime(h.changed_at)}</span>
                        {h.reason ? (
                          <p className="text-xs text-gray-500 mt-1">Reason: {h.reason}</p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-5 h-fit lg:sticky lg:top-8">
          <div>
            <p className="text-[10px] uppercase text-gray-500">Status</p>
            <select
              value={issue.status}
              disabled={!editable || saving}
              onChange={(e) => patchIssue({ status: e.target.value })}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {ISSUE_STATUSES.filter((s) => allowedStatuses.includes(s.value)).map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {!canSetClosedStatus(user.role) && (
              <p className="text-[10px] text-gray-500 mt-1">Closing an issue is limited to project managers and admins.</p>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-500">Priority</p>
            <select
              value={issue.priority}
              disabled={!editable || saving}
              onChange={(e) => patchIssue({ priority: e.target.value })}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className={`text-xs mt-2 font-semibold uppercase ${priorityTone(issue.priority)}`}>
              {priorityLabel(issue.priority)}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-500">Type</p>
            <select
              value={issue.type}
              disabled={!editable || saving}
              onChange={(e) => patchIssue({ type: e.target.value })}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-500">Assignee</p>
            {canAssignIssue(user) ? (
              <select
                value={issue.assigned_to || ''}
                disabled={saving}
                onChange={(e) => assignToUser(e.target.value)}
                className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.username}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-white mt-1">{issue.assigned_to_username ?? 'Unassigned'}</p>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-500">Reporter</p>
            <p className="text-sm text-white mt-1">{issue.reported_by_username ?? '—'}</p>
          </div>

          {issue.labels?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-2">Labels</p>
              <div className="flex flex-wrap gap-2">
                {issue.labels.map((lb) => (
                  <span
                    key={lb.label_id}
                    className="text-xs px-2 py-1 rounded-full border border-[#d2f5fa]/20"
                    style={lb.color_hex ? { borderColor: lb.color_hex, color: lb.color_hex } : {}}
                  >
                    {lb.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-gray-500 space-y-1 pt-2 border-t border-[#d2f5fa]/10">
            <p>Created: {formatCommentTime(issue.created_at)}</p>
            <p>Updated: {formatCommentTime(issue.last_updated)}</p>
            {issue.resolved_at ? <p>Resolved: {formatCommentTime(issue.resolved_at)}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
