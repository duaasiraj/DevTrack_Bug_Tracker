import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  LayoutGrid,
  Plus,
  ScrollText,
  Users,
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from '../constants/issueEnums'
import { setLastProjectId } from '../hooks/useLastProjectId'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '../components/ui/card'

const STATUS_CHART_COLORS = {
  open: '#38bdf8',
  in_progress: '#a78bfa',
  resolved: '#34d399',
  closed: '#6b7280',
}

const PRIORITY_COLORS = {
  low: '#7dd3fc',
  medium: '#94a3b8',
  high: '#fb923c',
  critical: '#f87171',
}

function StatusDistributionBar({ byStatus, total }) {
  const segments = useMemo(() => {
    if (!total) {
      return ISSUE_STATUSES.map((s) => ({ key: s.value, pct: 0, count: 0, label: s.label }))
    }
    return ISSUE_STATUSES.map((s) => ({
      key: s.value,
      pct: ((byStatus[s.value] || 0) / total) * 100,
      count: byStatus[s.value] || 0,
      label: s.label,
    }))
  }, [byStatus, total])

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#042124] ring-1 ring-[#78e5ef]/10">
        {segments.map((seg) =>
          seg.pct > 0 ? (
            <div
              key={seg.key}
              className="h-full transition-all duration-500"
              style={{
                width: `${seg.pct}%`,
                backgroundColor: STATUS_CHART_COLORS[seg.key] || '#64748b',
              }}
              title={`${seg.label}: ${seg.count}`}
            />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {segments.map((seg) => (
          <li
            key={seg.key}
            className="flex items-center gap-2 rounded-lg border border-[#d2f5fa]/8 bg-[#0b1117]/60 px-2.5 py-2 text-xs"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10"
              style={{ backgroundColor: STATUS_CHART_COLORS[seg.key] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-gray-400">{seg.label}</span>
            <span className="tabular-nums font-semibold text-white">{seg.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResolvedDonut({ resolved, unresolved, total }) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0
  const r = 52
  const c = 2 * Math.PI * r
  const filled = total > 0 ? (resolved / total) * c : 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#042124" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#34d399"
            strokeWidth="12"
            strokeDasharray={`${filled} ${c}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
          <span className="text-[10px] uppercase tracking-wider text-gray-500">resolved</span>
        </div>
      </div>
      <div className="w-full max-w-xs space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <span className="flex items-center gap-2 text-emerald-200">
            <CheckCircle2 size={16} aria-hidden />
            Resolved / closed
          </span>
          <span className="font-mono text-emerald-100 tabular-nums">{resolved}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#78e5ef]/20 bg-[#78e5ef]/5 px-3 py-2">
          <span className="flex items-center gap-2 text-gray-300">
            <CircleDot size={16} className="text-[#78e5ef]/80" aria-hidden />
            Open + in progress
          </span>
          <span className="font-mono text-gray-200 tabular-nums">{unresolved}</span>
        </div>
        <p className="text-center text-[11px] text-gray-600">Resolved + closed vs all other statuses</p>
      </div>
    </div>
  )
}

function PriorityBars({ byPriority }) {
  const max = Math.max(1, ...ISSUE_PRIORITIES.map((p) => byPriority[p.value] || 0))

  return (
    <ul className="space-y-3">
      {ISSUE_PRIORITIES.map((p) => {
        const n = byPriority[p.value] || 0
        const w = (n / max) * 100
        return (
          <li key={p.value}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-400">{p.label}</span>
              <span className="tabular-nums text-gray-300">{n}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#042124]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${w}%`,
                  backgroundColor: PRIORITY_COLORS[p.value] || '#94a3b8',
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLastProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [pr, mem, st] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/members`),
          api.get(`/projects/${projectId}/stats`),
        ])
        if (cancelled) return
        setProject(pr.data.data)
        setMembers(Array.isArray(mem.data.data) ? mem.data.data : [])
        setStats(st.data.data || null)
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message || 'Could not load project')
        setProject(null)
        setMembers([])
        setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const canManageMembers = user?.role === 'admin' || user?.role === 'project_manager'

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6 dt-animate-in" aria-busy="true">
        <div className="h-8 w-48 rounded-lg bg-[#171c1d] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-6 dt-animate-in">
        <p className="text-sm text-red-300">{error || 'Project not found.'}</p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#78e5ef] hover:underline"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to projects
        </Link>
      </div>
    )
  }

  const total = stats?.total_issues ?? 0
  const byStatus = stats?.by_status ?? {}
  const byPriority = stats?.by_priority ?? {}
  const resolved = stats?.resolved_count ?? 0
  const unresolved = stats?.unresolved_count ?? 0

  return (
    <div className="max-w-5xl space-y-8 pb-10 dt-animate-in">
      <div>
        <p className="text-xs text-gray-500">
          <Link to="/projects" className="text-[#78e5ef] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded">
            Projects
          </Link>
          <span className="mx-2 text-gray-600">›</span>
          <span className="text-gray-300">{project.name}</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400 leading-relaxed">
              {project.description || 'No description yet.'}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-wider text-[#78e5ef]/50">
              Status: {String(project.status || 'active').replace(/_/g, ' ')}
              {project.created_by_username ? ` · Created by ${project.created_by_username}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/projects/${projectId}/board`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#78e5ef] px-4 py-2.5 text-sm font-semibold text-[#042124] hover:bg-[#9eedf3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
            >
              <LayoutGrid size={18} aria-hidden />
              Board
            </Link>
            <Link
              to={`/projects/${projectId}/issues/new`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#78e5ef]/35 px-4 py-2.5 text-sm font-medium text-[#78e5ef] hover:bg-[#78e5ef]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              <Plus size={18} aria-hidden />
              New issue
            </Link>
            <Link
              to={`/projects/${projectId}/issue-log`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d2f5fa]/15 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              <ScrollText size={18} aria-hidden />
              Issue log
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#78e5ef]">
              <Activity size={18} aria-hidden />
              Total issues
            </CardTitle>
            <CardDescription>All work items in this project</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums text-white">{total}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Resolution progress</CardTitle>
            <CardDescription>Share of issues that are resolved or closed vs still active</CardDescription>
          </CardHeader>
          <CardContent>
            <ResolvedDonut resolved={resolved} unresolved={unresolved} total={total} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issues by status</CardTitle>
            <CardDescription>Distribution across your workflow columns</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistributionBar byStatus={byStatus} total={total} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Issues by priority</CardTitle>
            <CardDescription>Where risk and urgency cluster</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityBars byPriority={byPriority} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-[#78e5ef]/80" aria-hidden />
              Project members
            </CardTitle>
            <CardDescription>
              {members.length} teammate{members.length === 1 ? '' : 's'}
              {canManageMembers ? ' · Add or remove people from the main Projects list.' : ''}
            </CardDescription>
          </div>
          {canManageMembers && (
            <Link
              to="/projects"
              className="text-xs font-medium text-[#78e5ef] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
            >
              Manage on projects →
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No members loaded.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#d2f5fa]/8">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d2f5fa]/10 bg-[#0b1117]/50 text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Org role</th>
                    <th className="px-4 py-3 font-semibold">Project role</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d2f5fa]/8">
                  {members.map((m) => (
                    <tr key={m.user_id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                              m.project_role === 'project_manager' || m.project_role === 'project_lead'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-[#78e5ef]/15 text-[#78e5ef]',
                            )}
                          >
                            {(m.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {m.username}
                              {String(m.user_id) === String(user?.user_id) && (
                                <span className="ml-2 text-[10px] font-normal text-gray-500">(you)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 capitalize">
                        {String(m.role || '').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">
                        {String(m.project_role || '').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
