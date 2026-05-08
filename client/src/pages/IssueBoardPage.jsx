import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Filter, MoreHorizontal, Plus, ScrollText, Search, Table2, X } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, priorityLabel, statusLabel } from '../constants/issueEnums'
import { canSetClosedStatus } from '../utils/issuePermissions'
import { formatIssueKey, priorityTone, statusColumnColor } from '../utils/issueDisplay'
import { setLastProjectId } from '../hooks/useLastProjectId'
import IssuesTable from '../components/IssuesTable'
import IssueLabelChips from '../components/IssueLabelChips'

const BOARD_COLUMNS = ['open', 'in_progress', 'resolved', 'closed']

export default function IssueBoardPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterType, setFilterType] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  /** After drop: confirm with optional reason before PATCH. */
  const [pendingStatusMove, setPendingStatusMove] = useState(null)
  const [boardStatusReason, setBoardStatusReason] = useState('')
  const [boardMoveSaving, setBoardMoveSaving] = useState(false)

  useEffect(() => {
    if (!pendingStatusMove) return
    function onKey(e) {
      if (e.key === 'Escape' && !boardMoveSaving) {
        setPendingStatusMove(null)
        setBoardStatusReason('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingStatusMove, boardMoveSaving])

  useEffect(() => {
    setLastProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!projectId || !user) return
    let cancelled = false
      ; (async () => {
        await Promise.resolve()
        if (cancelled) return
        setLoading(true)
        setError('')
        try {
          const [projRes, issuesRes] = await Promise.all([
            api.get(`/projects/${projectId}`),
            api.get('/issues/', {
              params: {
                project_id: projectId,
                ...(user.role === 'developer' ? { assigned_to: user.user_id } : {}),
                ...(filterStatus ? { status: filterStatus } : {}),
                ...(filterPriority ? { priority: filterPriority } : {}),
                ...(filterType ? { type: filterType } : {}),
              },
            }),
          ])
          if (cancelled) return
          setProject(projRes.data.data)
          setIssues(issuesRes.data.data || [])
        } catch (e) {
          if (cancelled) return
          setError(e.response?.data?.message || e.message || 'Failed to load board')
          setProject(null)
          setIssues([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [projectId, user, filterStatus, filterPriority, filterType])

  const refreshBoard = async () => {
    if (!projectId || !user) return
    setLoading(true)
    setError('')
    try {
      const [projRes, issuesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/issues/', {
          params: {
            project_id: projectId,
            ...(user.role === 'developer' ? { assigned_to: user.user_id } : {}),
            ...(filterStatus ? { status: filterStatus } : {}),
            ...(filterPriority ? { priority: filterPriority } : {}),
            ...(filterType ? { type: filterType } : {}),
          },
        }),
      ])
      setProject(projRes.data.data)
      setIssues(issuesRes.data.data || [])
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return issues
    return issues.filter((i) => {
      const hay = [
        i.title,
        i.description,
        i.reported_by_username,
        i.assigned_to_username,
        formatIssueKey(i.issue_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [issues, search])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, []]))
    for (const issue of filteredIssues) {
      if (map[issue.status]) map[issue.status].push(issue)
    }
    return map
  }, [filteredIssues])

  const useTableView = Boolean(
    search.trim() !== '' || filterStatus || filterPriority || filterType,
  )

  async function handleDropColumn(status) {
    setMoveError('')
    if (!draggingId) return
    const issue = issues.find((i) => i.issue_id === draggingId)
    if (!issue || issue.status === status) {
      setDraggingId(null)
      return
    }
    if (status === 'closed' && !canSetClosedStatus(user.role)) {
      setMoveError('Only project managers and admins can move issues to Closed.')
      setDraggingId(null)
      return
    }
    setBoardStatusReason('')
    setPendingStatusMove({
      issueId: draggingId,
      fromStatus: issue.status,
      targetStatus: status,
      title: issue.title,
    })
    setDraggingId(null)
  }

  function closeBoardStatusModal() {
    setPendingStatusMove(null)
    setBoardStatusReason('')
    setBoardMoveSaving(false)
    setMoveError('')
  }

  async function confirmBoardStatusMove() {
    if (!pendingStatusMove) return
    const { issueId, targetStatus } = pendingStatusMove
    const trimmed = boardStatusReason.trim()
    setBoardMoveSaving(true)
    setMoveError('')
    try {
      await api.patch(`/issues/${issueId}`, {
        status: targetStatus,
        ...(trimmed ? { reason: trimmed } : {}),
      })
      closeBoardStatusModal()
      await refreshBoard()
    } catch (e) {
      setMoveError(e.response?.data?.message || e.message || 'Could not update status')
    } finally {
      setBoardMoveSaving(false)
    }
  }

  if (loading && !project) {
    return (
      <div className="space-y-6 dt-animate-in" aria-busy="true" aria-label="Loading board">
        <div className="h-4 w-48 rounded-lg bg-[#171c1d] animate-pulse" />
        <div className="h-9 w-64 rounded-lg bg-[#171c1d] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[#d2f5fa]/10 bg-[#0b1117]/60 overflow-hidden">
              <div className="h-12 border-b border-[#d2f5fa]/10 bg-[#171c1d]/40 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-24 rounded-xl bg-[#171c1d]/80 animate-pulse" />
                <div className="h-24 rounded-xl bg-[#171c1d]/80 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="max-w-md space-y-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 dt-animate-in">
        <p className="text-red-300 text-sm leading-relaxed">{error}</p>
        <Link
          to="/projects"
          className="inline-flex text-sm font-medium text-[#78e5ef] hover:text-[#9eedf3] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
        >
          Back to projects
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 dt-animate-in">
      {/* breadcrumb + header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            <Link to="/projects" className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5">
              Projects
            </Link>
            <span className="mx-2 text-gray-600">›</span>
            <span className="text-gray-300">{project?.name ?? '…'}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight flex items-center gap-2">
            {useTableView ? <Table2 className="text-[#78e5ef] shrink-0" size={26} aria-hidden /> : null}
            Board
          </h1>
          {useTableView && (
            <p className="text-xs text-[#78e5ef]/90 mt-2 max-w-xl leading-relaxed">
              Table view is on while search or filters are active. Clear them to return to the kanban board.
            </p>
          )}
          {user?.role === 'developer' && (
            <p className="text-xs text-amber-400/90 mt-2 max-w-xl leading-relaxed">
              You are viewing issues assigned to you or reported by you in this project.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78e5ef]/40 pointer-events-none" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]/50 focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25 transition-shadow"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm text-gray-300 hover:bg-white/5 hover:border-[#78e5ef]/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
          >
            <Filter size={16} aria-hidden />
            Filter
          </button>
          <Link
            to={`/projects/${projectId}/issue-log`}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm text-gray-300 hover:bg-white/5 hover:border-[#78e5ef]/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
          >
            <ScrollText size={16} aria-hidden />
            Issue log
          </Link>
          <Link
            to={`/projects/${projectId}/issues/new`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] transition-colors shadow-md shadow-[#78e5ef]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
          >
            <Plus size={18} aria-hidden />
            New Issue
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 sm:p-5 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 shadow-inner shadow-black/20 dt-animate-in">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35 min-w-[140px]"
          >
            <option value="">All statuses</option>
            {ISSUE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35 min-w-[140px]"
          >
            <option value="">All priorities</option>
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35 min-w-[120px]"
          >
            <option value="">All types</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setFilterStatus('')
              setFilterPriority('')
              setFilterType('')
            }}
            className="text-xs font-medium text-[#78e5ef] hover:text-[#9eedf3] px-2 py-2 rounded-lg hover:bg-[#78e5ef]/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
          >
            Clear filters
          </button>
        </div>
      )}

      {moveError && !useTableView && (
        <p className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3 leading-relaxed">
          {moveError}
        </p>
      )}

      {useTableView ? (
        <IssuesTable
          issues={filteredIssues}
          hrefForIssue={(issue) => `/projects/${projectId}/issues/${issue.issue_id}`}
        />
      ) : (
      /* kanban */
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {BOARD_COLUMNS.map((col) => (
          <div
            key={col}
            className="rounded-2xl border border-[#d2f5fa]/10 bg-[#0b1117]/70 min-h-[140px] shadow-lg shadow-black/20 transition-colors hover:border-[#78e5ef]/15"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropColumn(col)}
          >
            <div className="flex items-center justify-between px-3 py-3.5 border-b border-[#d2f5fa]/10 bg-[#171c1d]/30 rounded-t-2xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ring-2 ring-white/5 ${statusColumnColor(col)}`} />
                <span className="text-sm font-semibold text-gray-100 truncate">
                  {ISSUE_STATUSES.find((s) => s.value === col)?.label ?? col}
                </span>
                <span className="text-xs tabular-nums text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                  {grouped[col].length}
                </span>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/30"
                aria-label="Column menu"
              >
                <MoreHorizontal size={18} aria-hidden />
              </button>
            </div>
            <div className="p-2.5 space-y-2.5 min-h-[80px]">
              {grouped[col].map((issue) => (
                <Link
                  key={issue.issue_id}
                  to={`/projects/${projectId}/issues/${issue.issue_id}`}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    setDraggingId(issue.issue_id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`block rounded-xl border border-[#d2f5fa]/8 bg-[#171c1d]/90 p-3.5 hover:border-[#78e5ef]/35 hover:shadow-md hover:shadow-black/20 transition-all duration-200 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 ${
                    draggingId === issue.issue_id ? 'opacity-55 scale-[0.98]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono text-[#78e5ef]/85 ${
                        issue.status === 'resolved' || issue.status === 'closed' ? 'line-through opacity-70' : ''
                      }`}
                    >
                      {formatIssueKey(issue.issue_id)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-black/25 ${priorityTone(issue.priority)}`}
                    >
                      {priorityLabel(issue.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-100 mt-2.5 line-clamp-2 leading-snug font-medium">{issue.title}</p>
                  <IssueLabelChips labels={issue.labels || []} className="mt-2" />
                  <div className="flex items-center justify-between mt-3.5 gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {issue.type}
                    </span>
                    <div className="flex -space-x-1">
                      {issue.assigned_to_username ? (
                        <span
                          className="w-7 h-7 rounded-full bg-[#78e5ef]/15 border border-[#0b1117] text-[10px] flex items-center justify-center text-[#78e5ef] font-semibold"
                          title={issue.assigned_to_username}
                        >
                          {issue.assigned_to_username.slice(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600">—</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {grouped[col].length === 0 && !loading && (
                <p className="text-center text-xs text-gray-600 py-6 px-2">Drop issues here</p>
              )}
              <Link
                to={`/projects/${projectId}/issues/new`}
                className="block text-center text-xs font-medium text-[#78e5ef]/80 hover:text-[#78e5ef] py-2.5 rounded-lg hover:bg-[#78e5ef]/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/30"
              >
                + Add issue
              </Link>
            </div>
          </div>
        ))}
      </div>
      )}

      {pendingStatusMove ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="board-status-title"
          onClick={() => !boardMoveSaving && closeBoardStatusModal()}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-[#d2f5fa]/15 bg-[#0f1415] shadow-2xl shadow-black/40 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="board-status-title" className="text-lg font-semibold text-white pr-2">
                Move card
              </h2>
              <button
                type="button"
                disabled={boardMoveSaving}
                onClick={closeBoardStatusModal}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 shrink-0"
                aria-label="Close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 line-clamp-2" title={pendingStatusMove.title}>
              {pendingStatusMove.title}
            </p>
            <p className="mt-3 text-sm text-gray-400">
              <span className="text-gray-500">{statusLabel(pendingStatusMove.fromStatus)}</span>
              <span className="mx-2 text-[#78e5ef]">→</span>
              <span className="text-white font-medium">{statusLabel(pendingStatusMove.targetStatus)}</span>
            </p>
            {moveError ? (
              <p className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{moveError}</p>
            ) : null}
            <label className="mt-5 block">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                Reason <span className="normal-case font-normal text-gray-600">(optional)</span>
              </span>
              <textarea
                value={boardStatusReason}
                onChange={(e) => setBoardStatusReason(e.target.value)}
                disabled={boardMoveSaving}
                rows={3}
                placeholder="Brief note for the activity history…"
                className="mt-2 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35 resize-y min-h-[80px] disabled:opacity-45"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={boardMoveSaving}
                onClick={closeBoardStatusModal}
                className="px-4 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={boardMoveSaving}
                onClick={() => void confirmBoardStatusMove()}
                className="px-4 py-2.5 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
              >
                {boardMoveSaving ? 'Saving…' : 'Apply move'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
