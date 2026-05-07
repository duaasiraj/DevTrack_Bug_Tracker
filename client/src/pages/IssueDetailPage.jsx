import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  priorityLabel,
  statusLabel,
} from '../constants/issueEnums'
import {
  canAssignIssue,
  canEditIssueFields,
  canSetClosedStatus,
  developerCanViewIssue,
  getSelectableStatuses,
  canReopenIssue,
} from '../utils/issuePermissions'
import { formatIssueKey, priorityTone } from '../utils/issueDisplay'
import { setLastProjectId } from '../hooks/useLastProjectId'
import { MessageSquare, History, Tag, X } from 'lucide-react'
import IssueLabelChips from '../components/IssueLabelChips'

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
  const [projectLabels, setProjectLabels] = useState([])
  const [project, setProject] = useState(null)

  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('')
  const [labelBusy, setLabelBusy] = useState(false)

  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [commentText, setCommentText] = useState('')
  const [tab, setTab] = useState('comments')

  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const [saving, setSaving] = useState(false)

  /** When set, show modal to optionally attach a reason before PATCH. */
  const [statusChangeModal, setStatusChangeModal] = useState(null)
  const [statusChangeReason, setStatusChangeReason] = useState('')

  useEffect(() => {
    if (!statusChangeModal) return
    function onKey(e) {
      if (e.key === 'Escape') {
        setStatusChangeModal(null)
        setStatusChangeReason('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [statusChangeModal])

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
      setLoadError(
        e.response?.data?.message || e.message || 'Failed to load issue'
      )

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

        let lblData = []
        try {
          const lr = await api.get(`/projects/${projectId}/labels`)
          lblData = lr.data.data || []
        } catch {
          lblData = []
        }
        if (!cancelled) setProjectLabels(lblData)
      } catch (e) {
        if (cancelled) return

        setLoadError(
          e.response?.data?.message || e.message || 'Failed to load issue'
        )

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
      await api.post(`/issues/${issueId}/comments`, {
        content: commentText.trim(),
      })

      setCommentText('')

      await refreshComments()
    } catch (e) {
      setActionError(
        e.response?.data?.message || e.message || 'Could not add comment'
      )
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
      setActionError(
        e.response?.data?.message || e.message || 'Update failed'
      )
    } finally {
      setSaving(false)
    }
  }

  function requestStatusChange(nextStatus) {
    if (!issue || nextStatus === issue.status) return
    setStatusChangeReason('')
    setStatusChangeModal({ nextStatus })
  }

  function closeStatusChangeModal() {
    setStatusChangeModal(null)
    setStatusChangeReason('')
  }

  async function confirmStatusChange() {
    if (!statusChangeModal || !issue) return
    const { nextStatus } = statusChangeModal
    const trimmed = statusChangeReason.trim()
    closeStatusChangeModal()
    await patchIssue({
      status: nextStatus,
      ...(trimmed ? { reason: trimmed } : {}),
    })
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
      await api.patch(`/issues/${issueId}/assign`, {
        assigned_to: uid,
      })

      await refreshIssueAndProject()
    } catch (e) {
      setActionError(
        e.response?.data?.message || e.message || 'Assignment failed'
      )
    }
  }

  async function deleteComment(cid) {
    if (!window.confirm('Delete this comment?')) return

    setActionError('')

    try {
      await api.delete(`/issues/${issueId}/comments/${cid}`)

      await refreshComments()
    } catch (e) {
      setActionError(
        e.response?.data?.message || e.message || 'Could not delete comment'
      )
    }
  }

  async function attachLabelById(labelId) {
    if (!labelId || !editable) return
    setActionError('')
    try {
      await api.post(`/issues/${issueId}/labels`, { label_id: labelId })
      await refreshIssueAndProject()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Could not add label')
    }
  }

  async function detachLabelById(labelId) {
    if (!editable) return
    setActionError('')
    try {
      await api.delete(`/issues/${issueId}/labels/${labelId}`)
      await refreshIssueAndProject()
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Could not remove label')
    }
  }

  async function createProjectLabel(e) {
    e.preventDefault()
    if (!newLabelName.trim()) return
    setActionError('')
    setLabelBusy(true)
    try {
      await api.post(`/projects/${projectId}/labels`, {
        name: newLabelName.trim(),
        color_hex: newLabelColor.trim() || undefined,
      })
      setNewLabelName('')
      setNewLabelColor('')
      const r = await api.get(`/projects/${projectId}/labels`)
      setProjectLabels(r.data.data || [])
    } catch (e) {
      setActionError(e.response?.data?.message || e.message || 'Could not create label')
    } finally {
      setLabelBusy(false)
    }
  }

  async function deleteIssue() {
    if (!window.confirm('Delete this issue permanently?')) return

    setActionError('')

    try {
      await api.delete(`/issues/${issueId}`)

      window.location.href = `/projects/${projectId}/board`
    } catch (e) {
      setActionError(
        e.response?.data?.message || e.message || 'Could not delete issue'
      )
    }
  }

  if (loadError && !issue) {
    return (
      <div className="max-w-md space-y-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <p className="text-red-300 text-sm leading-relaxed">{loadError}</p>

        <Link
          to={`/projects/${projectId}/board`}
          className="inline-flex text-sm font-medium text-[#78e5ef] hover:text-[#9eedf3] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
        >
          Back to board
        </Link>
      </div>
    )
  }

  if (!issue || !user) {
    return (
      <div className="max-w-6xl space-y-4 dt-animate-in" aria-busy="true">
        <div className="h-3 w-40 rounded bg-[#171c1d] animate-pulse" />
        <div className="h-8 w-3/4 max-w-xl rounded-lg bg-[#171c1d] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 h-48 rounded-2xl bg-[#171c1d]/80 animate-pulse" />
          <div className="h-64 rounded-2xl bg-[#171c1d]/80 animate-pulse" />
        </div>
      </div>
    )
  }

  if (
    user.role === 'developer' &&
    !developerCanViewIssue(user.user_id, issue)
  ) {
    return <Navigate to={`/projects/${projectId}/board`} replace />
  }

  const editable = canEditIssueFields(user, issue)
  const allowedStatuses = getSelectableStatuses(user.role, issue.status)
  const showAssign = canAssignIssue(user)
  const canDefineLabels = user.role === 'admin' || user.role === 'project_manager'
  const onIssueLabelIds = new Set((issue.labels || []).map((l) => l.label_id))
  const labelsToAdd = projectLabels.filter((l) => !onIssueLabelIds.has(l.label_id))

  return (
    <div className="max-w-6xl dt-animate-in pb-10">
      <p className="text-xs text-gray-500">
        <Link to="/projects" className="hover:text-[#78e5ef]">
          Projects
        </Link>

        <span className="mx-2">›</span>

        <Link
          to={`/projects/${projectId}/board`}
          className="hover:text-[#78e5ef]"
        >
          {project?.name ?? '…'}
        </Link>

        <span className="mx-2">›</span>

        <span className="text-gray-300">
          {formatIssueKey(issue.issue_id)}
        </span>
      </p>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white pr-4 leading-tight">
            {issue.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d2f5fa]/10 bg-[#042124]/80 px-3 py-1 text-xs font-medium text-gray-200">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
              {statusLabel(issue.status)}
            </span>
            <span
              className={`inline-flex items-center rounded-full border border-[#d2f5fa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${priorityTone(issue.priority)} bg-[#171c1d]/80`}
            >
              {priorityLabel(issue.priority)}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#d2f5fa]/10 bg-[#171c1d]/60 px-3 py-1 text-xs text-gray-400 capitalize">
              {issue.type}
            </span>
          </div>
          <IssueLabelChips labels={issue.labels || []} className="mt-3" />
        </div>

        <div className="flex gap-2 shrink-0">
          {editable && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraftTitle(issue.title || '')
                setDraftDescription(issue.description || '')
                setEditing(true)
              }}
              className="px-4 py-2.5 rounded-xl border border-[#78e5ef]/35 text-sm font-medium text-[#78e5ef] bg-[#78e5ef]/5 hover:bg-[#78e5ef]/12 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mt-4 text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3 leading-relaxed">
          {actionError}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            <form
              onSubmit={saveEdits}
              className="space-y-4 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 p-5 sm:p-6 shadow-lg shadow-black/20"
            >
              <div>
                <label className="text-[10px] uppercase text-gray-500">
                  Title
                </label>

                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-500">
                  Description
                </label>

                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={10}
                  className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-white text-sm resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
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
                  className="px-4 py-2.5 text-sm rounded-xl border border-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 p-5 sm:p-6 shadow-md shadow-black/15">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {issue.description?.trim() ? (
                  issue.description
                ) : (
                  <span className="text-gray-500">
                    No description.
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/35 overflow-hidden shadow-lg shadow-black/20">
            <div
              role="tablist"
              aria-label="Issue discussion"
              className="flex border-b border-[#d2f5fa]/10 p-1 gap-1 bg-[#0b1117]/50"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'comments'}
                id="tab-comments"
                aria-controls="panel-comments"
                onClick={() => setTab('comments')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 ${
                  tab === 'comments'
                    ? 'bg-[#78e5ef]/15 text-[#78e5ef] shadow-sm'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <MessageSquare size={16} aria-hidden />
                Comments
                <span className="text-xs tabular-nums opacity-70">({comments.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'history'}
                id="tab-history"
                aria-controls="panel-history"
                onClick={() => setTab('history')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 ${
                  tab === 'history'
                    ? 'bg-[#78e5ef]/15 text-[#78e5ef] shadow-sm'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <History size={16} aria-hidden />
                Activity
                <span className="text-xs tabular-nums opacity-70">({history.length})</span>
              </button>
            </div>

            {tab === 'comments' ? (
              <div id="panel-comments" role="tabpanel" aria-labelledby="tab-comments" className="p-5 sm:p-6">
                <form onSubmit={postComment} className="space-y-3">
                  <label htmlFor="comment-input" className="sr-only">
                    New comment
                  </label>
                  <textarea
                    id="comment-input"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={3}
                    className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 resize-y min-h-[88px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="px-4 py-2 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
                    >
                      Post comment
                    </button>
                  </div>
                </form>

                <ul className="mt-8 space-y-4">
                  {comments.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-[#d2f5fa]/15 bg-[#042124]/30 px-4 py-10 text-center text-sm text-gray-500">
                      No comments yet. Start the thread above.
                    </li>
                  ) : (
                    comments.map((c) => {
                      const canDelete = user.role === 'admin' || c.user_id === user.user_id
                      return (
                        <li
                          key={c.comment_id}
                          className="rounded-xl border border-[#d2f5fa]/8 bg-[#0b1117]/60 px-4 py-3 transition-colors hover:border-[#78e5ef]/15"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white">{c.username}</p>
                            <time className="text-[11px] text-gray-500 shrink-0 tabular-nums" dateTime={c.created_at}>
                              {formatCommentTime(c.created_at)}
                            </time>
                          </div>
                          <p className="mt-2 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                          {canDelete ? (
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void deleteComment(c.comment_id)}
                                className="text-xs text-red-400/90 hover:text-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 rounded px-1"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            ) : (
              <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="p-5 sm:p-6">
                <ul className="space-y-0">
                  {history.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-[#d2f5fa]/15 bg-[#042124]/30 px-4 py-10 text-center text-sm text-gray-500">
                      No status changes recorded yet.
                    </li>
                  ) : (
                    history.map((h) => (
                      <li
                        key={h.history_id}
                        className="flex gap-4 pb-5 border-l-2 border-[#78e5ef]/20 pl-4 ml-1.5 relative last:pb-0 last:border-l-transparent"
                      >
                        <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#78e5ef]" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-300">{h.changed_by_username ?? 'System'}</span>
                            <span className="mx-2 text-gray-600">·</span>
                            <time dateTime={h.changed_at} className="tabular-nums">
                              {formatCommentTime(h.changed_at)}
                            </time>
                          </p>
                          <p className="mt-2 text-sm text-gray-200">
                            <span className="text-gray-500">{statusLabel(h.old_status)}</span>
                            <span className="mx-2 text-[#78e5ef]">→</span>
                            <span className="font-medium text-white">{statusLabel(h.new_status)}</span>
                          </p>
                          {h.reason ? (
                            <p className="mt-1 text-xs text-gray-500 italic">{h.reason}</p>
                          ) : null}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-5 sm:p-6 h-fit lg:sticky lg:top-24 shadow-lg shadow-black/20">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase text-gray-500">
                Status
              </p>

              {canReopenIssue(user, issue) && (
                <button
                  type="button"
                  onClick={() => requestStatusChange('open')}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-400/25 hover:bg-amber-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                >
                  Reopen
                </button>
              )}
            </div>

            <select
              value={issue.status}
              disabled={!editable || saving}
              onChange={(e) => requestStatusChange(e.target.value)}
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              {ISSUE_STATUSES.filter((s) =>
                allowedStatuses.includes(s.value)
              ).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {!canSetClosedStatus(user.role) && (
              <p className="text-[10px] text-gray-500 mt-1">
                Closing an issue is limited to project managers and admins.
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-2 leading-snug">
              When you change status, you can add an optional note for the history (visible in the Activity tab).
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-500">
              Priority
            </p>

            <select
              value={issue.priority}
              disabled={!editable || saving}
              onChange={(e) =>
                patchIssue({ priority: e.target.value })
              }
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <p
              className={`text-xs mt-2 font-semibold uppercase tracking-wide ${priorityTone(
                issue.priority
              )}`}
            >
              {priorityLabel(issue.priority)}
            </p>
          </div>

          {showAssign && (
            <div className="pt-1 border-t border-[#d2f5fa]/10">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Assignee
              </p>
              <select
                value={issue.assigned_to ? String(issue.assigned_to) : ''}
                disabled={saving}
                onChange={(e) => {
                  const v = e.target.value
                  if (v && v !== String(issue.assigned_to || '')) assignToUser(v)
                }}
                className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.username}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                Choose a project member to notify them automatically.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-[#d2f5fa]/10">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Tag size={12} className="text-[#78e5ef]/70" aria-hidden />
              Labels
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(issue.labels || []).map((lb) => (
                <span
                  key={lb.label_id}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-gray-200"
                  style={{
                    backgroundColor: lb.color_hex ? `${lb.color_hex}2a` : 'rgba(120,229,239,0.1)',
                    borderColor: lb.color_hex ? `${lb.color_hex}55` : undefined,
                  }}
                >
                  {lb.name}
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => void detachLabelById(lb.label_id)}
                      className="text-gray-500 hover:text-red-300 text-sm leading-none px-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
                      aria-label={`Remove label ${lb.name}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {(issue.labels || []).length === 0 ? (
                <span className="text-xs text-gray-600">No labels</span>
              ) : null}
            </div>
            {editable ? (
              <select
                defaultValue=""
                disabled={saving || labelsToAdd.length === 0}
                onChange={(e) => {
                  const v = e.target.value
                  if (v) {
                    void attachLabelById(v)
                    e.target.value = ''
                  }
                }}
                className="mt-2 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2 text-sm text-white disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
              >
                <option value="">{labelsToAdd.length ? 'Add label…' : 'All project labels applied'}</option>
                {labelsToAdd.map((l) => (
                  <option key={l.label_id} value={l.label_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            ) : null}
            {canDefineLabels ? (
              <form onSubmit={createProjectLabel} className="mt-3 space-y-2 rounded-xl border border-[#d2f5fa]/10 bg-[#042124]/40 p-3">
                <p className="text-[10px] uppercase text-gray-500">New project label</p>
                <input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-gray-600"
                />
                <input
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  placeholder="#hex color (optional)"
                  className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-2 py-1.5 text-xs text-white font-mono placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={labelBusy || !newLabelName.trim()}
                  className="w-full py-1.5 rounded-lg bg-[#78e5ef]/20 text-[#78e5ef] text-xs font-medium hover:bg-[#78e5ef]/30 disabled:opacity-40"
                >
                  {labelBusy ? 'Saving…' : 'Create label'}
                </button>
              </form>
            ) : null}
          </div>

          <div className="text-[11px] text-gray-500 space-y-1 pt-2 border-t border-[#d2f5fa]/10">
            <p>Created: {formatCommentTime(issue.created_at)}</p>

            <p>
              Updated: {formatCommentTime(issue.last_updated)}
            </p>

            {issue.resolved_at ? (
              <p>
                Resolved: {formatCommentTime(issue.resolved_at)}
              </p>
            ) : null}
          </div>

          {(user.role === 'admin' ||
            user.role === 'project_manager') && (
            <div className="pt-2 border-t border-[#d2f5fa]/10">
              <button
                type="button"
                onClick={deleteIssue}
                className="w-full px-4 py-2.5 rounded-xl border border-red-500/35 bg-red-500/10 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
              >
                Delete Issue
              </button>
            </div>
          )}
        </aside>
      </div>

      {statusChangeModal && issue ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-change-title"
          onClick={closeStatusChangeModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-[#d2f5fa]/15 bg-[#0f1415] shadow-2xl shadow-black/40 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="status-change-title" className="text-lg font-semibold text-white pr-2">
                Change status
              </h2>
              <button
                type="button"
                onClick={closeStatusChangeModal}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 shrink-0"
                aria-label="Close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              <span className="text-gray-500">{statusLabel(issue.status)}</span>
              <span className="mx-2 text-[#78e5ef]">→</span>
              <span className="text-white font-medium">{statusLabel(statusChangeModal.nextStatus)}</span>
            </p>
            <label className="mt-5 block">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                Reason <span className="normal-case font-normal text-gray-600">(optional)</span>
              </span>
              <textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                rows={3}
                placeholder="e.g. Waiting on design review, fixed in PR #42…"
                className="mt-2 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35 resize-y min-h-[80px]"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusChangeModal}
                className="px-4 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm font-medium text-gray-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmStatusChange()}
                className="px-4 py-2.5 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
              >
                {saving ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}