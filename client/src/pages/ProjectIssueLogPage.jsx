import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, MessageSquare, RefreshCw, ScrollText } from 'lucide-react'
import api from '../api/axios'
import { formatIssueKey } from '../utils/issueDisplay'
import { statusLabel } from '../constants/issueEnums'

function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function sectionLabelForDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function entryVisual(entryType) {
  if (entryType === 'comment') {
    return {
      icon: MessageSquare,
      box: 'bg-teal-500/10 text-teal-200 border-teal-400/25',
    }
  }
  return {
    icon: RefreshCw,
    box: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25',
  }
}

export default function ProjectIssueLogPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const [projRes, logRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/issue-log`),
        ])
        if (cancelled) return
        setProject(projRes.data.data)
        setEntries(Array.isArray(logRes.data.data) ? logRes.data.data : [])
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message || 'Could not load issue log')
        setProject(null)
        setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const grouped = useMemo(() => {
    const order = []
    const seen = new Set()
    const map = new Map()
    for (const row of entries) {
      const label = sectionLabelForDate(row.occurred_at)
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(row)
      if (!seen.has(label)) {
        seen.add(label)
        order.push(label)
      }
    }
    return order.map((label) => [label, map.get(label)])
  }, [entries])

  function openEntry(row) {
    if (projectId && row.issue_id) {
      navigate(`/projects/${projectId}/issues/${row.issue_id}`)
    }
  }

  function lineForRow(row) {
    if (row.entry_type === 'comment') {
      const preview = row.comment_preview || ''
      return (
        <>
          <span className="font-semibold text-white">{row.actor_username || 'Someone'}</span>
          <span className="text-gray-600"> · </span>
          commented{preview ? `: ${preview}` : ''}
          {preview && preview.length >= 280 ? '…' : ''}
        </>
      )
    }
    const fromL = statusLabel(row.old_status)
    const toL = statusLabel(row.new_status)
    return (
      <>
        <span className="font-semibold text-white">{row.actor_username || 'Someone'}</span>
        <span className="text-gray-600"> · </span>
        changed status from <span className="text-gray-200">{fromL}</span> to{' '}
        <span className="text-gray-200">{toL}</span>
      </>
    )
  }

  return (
    <div className="max-w-3xl space-y-8 dt-animate-in pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#d2f5fa]/10 pb-6">
        <div>
          <p className="text-xs text-gray-500">
            <Link
              to="/projects"
              className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5"
            >
              Projects
            </Link>
            <span className="mx-2 text-gray-600">›</span>
            <Link
              to={`/projects/${projectId}/board`}
              className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-0.5"
            >
              {project?.name ?? '…'}
            </Link>
            <span className="mx-2 text-gray-600">›</span>
            <span className="text-gray-300">Issue log</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2 flex items-center gap-2">
            <ScrollText className="text-[#78e5ef] shrink-0" size={28} aria-hidden />
            Issue log
          </h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-lg">
            Status changes and comments on issues in this project. Visible to all project members.
          </p>
        </div>
        <Link
          to={`/projects/${projectId}/board`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#78e5ef]/30 text-sm font-medium text-[#78e5ef] bg-[#78e5ef]/5 hover:bg-[#78e5ef]/12 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 shrink-0"
        >
          Back to board
        </Link>
      </div>

      {error && (
        <p className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3 leading-relaxed">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm" aria-busy="true">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d2f5fa]/15 bg-[#171c1d]/40 p-12 sm:p-14 text-center">
          <ScrollText className="mx-auto mb-4 text-[#78e5ef]/25" size={40} aria-hidden />
          <p className="text-gray-300 font-medium">No activity yet</p>
          <p className="text-xs mt-3 text-gray-500 max-w-xs mx-auto leading-relaxed">
            When issues move between columns or receive comments, entries appear here grouped by day.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([section, rows]) => (
            <section key={section}>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">{section}</h2>
              <ul className="space-y-2.5">
                {rows.map((row) => {
                  const vis = entryVisual(row.entry_type)
                  const Icon = vis.icon
                  const hasLink = Boolean(projectId && row.issue_id)
                  return (
                    <li key={`${row.entry_type}-${row.entry_id}`}>
                      <button
                        type="button"
                        onClick={() => openEntry(row)}
                        disabled={!hasLink}
                        className={`w-full text-left rounded-2xl border border-[#d2f5fa]/8 bg-[#171c1d]/50 p-4 sm:p-4 transition-all duration-200 hover:border-[#78e5ef]/20 hover:bg-[#171c1d]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 ${
                          hasLink ? 'cursor-pointer' : 'cursor-default opacity-90'
                        }`}
                      >
                        <div className="flex gap-3">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#78e5ef]/40" aria-hidden />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${vis.box}`}>
                            <Icon size={18} aria-hidden />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] text-gray-500 truncate">
                                <span className="text-[#78e5ef]/90 font-mono">{formatIssueKey(row.issue_id)}</span>
                                {row.issue_title ? (
                                  <span className="text-gray-500"> · {row.issue_title}</span>
                                ) : null}
                              </p>
                              <time
                                dateTime={row.occurred_at}
                                className="text-[11px] shrink-0 tabular-nums text-gray-600"
                              >
                                {relativeTime(row.occurred_at)}
                              </time>
                            </div>
                            <p className="text-sm mt-2 leading-relaxed text-gray-300">{lineForRow(row)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 leading-relaxed">
        Open an entry to go to that issue. Same layout style as your personal notifications.
      </p>
    </div>
  )
}
