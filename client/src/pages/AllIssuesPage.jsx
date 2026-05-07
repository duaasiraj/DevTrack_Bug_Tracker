import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Search } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from '../constants/issueEnums'
import { formatIssueKey } from '../utils/issueDisplay'
import IssuesTable from '../components/IssuesTable'

export default function AllIssuesPage() {
  const { user } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/issues/', {
          params: {
            scope: 'member_projects',
            ...(user.role === 'developer' ? { assigned_to: user.user_id } : {}),
            ...(filterStatus ? { status: filterStatus } : {}),
            ...(filterPriority ? { priority: filterPriority } : {}),
            ...(filterType ? { type: filterType } : {}),
          },
        })
        if (!cancelled) setIssues(res.data.data || [])
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || e.message || 'Failed to load issues')
          setIssues([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, filterStatus, filterPriority, filterType])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return issues
    return issues.filter((i) => {
      const hay = [
        i.title,
        i.description,
        i.reported_by_username,
        i.assigned_to_username,
        i.project_name,
        formatIssueKey(i.issue_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [issues, search])

  if (loading && issues.length === 0 && !error) {
    return (
      <div className="space-y-4 dt-animate-in" aria-busy="true">
        <div className="h-8 w-56 rounded-lg bg-[#171c1d] animate-pulse" />
        <div className="h-40 rounded-2xl bg-[#171c1d]/80 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 dt-animate-in max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            <Link to="/projects" className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5">
              Projects
            </Link>
            <span className="mx-2 text-gray-600">›</span>
            <span className="text-gray-300">All issues</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">All your issues</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
            Issues from every project you belong to
            {user?.role === 'developer' ? ', limited to items assigned to you or reported by you' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:max-w-md">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78e5ef]/40 pointer-events-none" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across projects…"
              className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]/50 focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm text-gray-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
          >
            <Filter size={16} aria-hidden />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 sm:p-5 rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/60">
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
            className="text-xs font-medium text-[#78e5ef] hover:text-[#9eedf3] px-2 py-2 rounded-lg hover:bg-[#78e5ef]/5"
          >
            Clear filters
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">{error}</p>
      )}

      {!loading && !error && issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d2f5fa]/15 bg-[#171c1d]/40 px-6 py-14 text-center text-sm text-gray-500">
          No issues in your projects yet.
        </div>
      ) : (
        <IssuesTable
          issues={filtered}
          showProject
          hrefForIssue={(issue) => `/projects/${issue.project_id}/issues/${issue.issue_id}`}
        />
      )}
    </div>
  )
}
