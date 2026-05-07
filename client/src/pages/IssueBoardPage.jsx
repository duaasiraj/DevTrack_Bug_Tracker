import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Filter, MoreHorizontal, Plus, Search } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, priorityLabel } from '../constants/issueEnums'
import { canSetClosedStatus } from '../utils/issuePermissions'
import { formatIssueKey, priorityTone, statusColumnColor } from '../utils/issueDisplay'
import { setLastProjectId } from '../hooks/useLastProjectId'

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

  useEffect(() => {
    setLastProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!projectId || !user) return
    let cancelled = false
    ;(async () => {
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
    try {
      await api.patch(`/issues/${draggingId}`, { status })
      await refreshBoard()
    } catch (e) {
      setMoveError(e.response?.data?.message || e.message || 'Could not update status')
    } finally {
      setDraggingId(null)
    }
  }

  if (loading && !project) {
    return <div className="text-gray-400 text-sm">Loading board…</div>
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Link to="/projects" className="text-[#78e5ef] text-sm underline">Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* breadcrumb + header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            <Link to="/projects" className="hover:text-[#78e5ef]">Projects</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-300">{project?.name ?? '…'}</span>
          </p>
          <h1 className="text-2xl font-bold text-white mt-2">Board</h1>
          {user?.role === 'developer' && (
            <p className="text-xs text-amber-400/90 mt-2 max-w-xl">
              You are viewing issues assigned to you in this project.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78e5ef]/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d2f5fa]/15 text-sm text-gray-300 hover:bg-white/5"
          >
            <Filter size={16} />
            Filter
          </button>
          <Link
            to={`/projects/${projectId}/issues/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3]"
          >
            <Plus size={18} />
            New Issue
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            {ISSUE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All priorities</option>
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
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
            className="text-xs text-[#78e5ef] underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {moveError && (
        <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">{moveError}</p>
      )}

      {/* kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {BOARD_COLUMNS.map((col) => (
          <div
            key={col}
            className="rounded-xl border border-[#d2f5fa]/10 bg-[#0b1117]/80 min-h-[120px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropColumn(col)}
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-[#d2f5fa]/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusColumnColor(col)}`} />
                <span className="text-sm font-medium text-gray-200 truncate">
                  {ISSUE_STATUSES.find((s) => s.value === col)?.label ?? col}
                </span>
                <span className="text-xs text-gray-500">({grouped[col].length})</span>
              </div>
              <button type="button" className="text-gray-500 hover:text-white p-1" aria-label="Column menu">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="p-2 space-y-2">
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
                  className={`block rounded-lg border border-[#d2f5fa]/10 bg-[#171c1d] p-3 hover:border-[#78e5ef]/40 transition-colors cursor-grab active:cursor-grabbing ${
                    draggingId === issue.issue_id ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono text-[#78e5ef]/80 ${
                        issue.status === 'resolved' || issue.status === 'closed' ? 'line-through opacity-70' : ''
                      }`}
                    >
                      {formatIssueKey(issue.issue_id)}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${priorityTone(issue.priority)}`}>
                      {priorityLabel(issue.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-100 mt-2 line-clamp-2">{issue.title}</p>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded">
                      {issue.type}
                    </span>
                    <div className="flex -space-x-1">
                      {issue.assigned_to_username ? (
                        <span
                          className="w-7 h-7 rounded-full bg-[#78e5ef]/20 border border-[#0b1117] text-[10px] flex items-center justify-center text-[#78e5ef] font-medium"
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
              <Link
                to={`/projects/${projectId}/issues/new`}
                className="block text-center text-xs text-[#78e5ef]/70 hover:text-[#78e5ef] py-2"
              >
                + Add Issue
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
