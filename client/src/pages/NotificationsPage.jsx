import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import api from '../api/axios'
import { formatIssueKey } from '../utils/issueDisplay'

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

function notifVisual(type) {
  switch (type) {
    case 'assigned':
      return {
        icon: UserPlus,
        box: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
      }
    case 'commented':
      return {
        icon: MessageSquare,
        box: 'bg-teal-500/10 text-teal-200 border-teal-400/25',
      }
    case 'status_changed':
      return {
        icon: RefreshCw,
        box: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25',
      }
    default:
      return {
        icon: Bell,
        box: 'bg-gray-500/10 text-gray-300 border-gray-500/25',
      }
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      setError('')
      setLoading(true)
      try {
        const r = await api.get('/notifications/')
        if (cancelled) return
        setItems(Array.isArray(r.data.data) ? r.data.data : [])
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message || 'Could not load notifications')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'unread') return items.filter((n) => !n.is_read)
    return items
  }, [items, tab])

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items])

  const grouped = useMemo(() => {
    const order = []
    const seen = new Set()
    const map = new Map()
    for (const n of filtered) {
      const label = sectionLabelForDate(n.created_at)
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(n)
      if (!seen.has(label)) {
        seen.add(label)
        order.push(label)
      }
    }
    return order.map((label) => [label, map.get(label)])
  }, [filtered])

  async function markAllRead() {
    setMarkingAll(true)
    setError('')
    try {
      await api.patch('/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  async function openNotification(n) {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.notif_id}/read`)
        setItems((prev) =>
          prev.map((x) => (x.notif_id === n.notif_id ? { ...x, is_read: true } : x)),
        )
      } catch {
        /* still navigate if applicable */
      }
    }
    if (n.project_id && n.issue_id) {
      navigate(`/projects/${n.project_id}/issues/${n.issue_id}`)
    }
  }

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#d2f5fa]/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-gray-400 mt-1">
            Stay updated on issues, assignments, and status changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#78e5ef]/30 text-sm text-[#78e5ef] hover:bg-[#78e5ef]/10 disabled:opacity-40 disabled:pointer-events-none"
        >
          {markingAll ? <Loader2 className="animate-spin" size={18} /> : <CheckCheck size={18} />}
          Mark all as read
        </button>
      </div>

      <div className="flex gap-6 border-b border-[#d2f5fa]/10">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'all'
              ? 'text-[#78e5ef] border-[#78e5ef]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          All activity
          <span className="ml-2 text-xs tabular-nums px-2 py-0.5 rounded-full bg-white/10">{items.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'unread'
              ? 'text-[#78e5ef] border-[#78e5ef]'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Unread
          <span className="ml-2 text-xs tabular-nums px-2 py-0.5 rounded-full bg-[#78e5ef]/15 text-[#78e5ef]">
            {unreadCount}
          </span>
        </button>
      </div>

      {error && (
        <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="animate-spin" size={18} />
          Loading notifications…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 p-12 text-center text-gray-500">
          <Bell className="mx-auto mb-3 text-[#78e5ef]/30" size={36} />
          <p>{tab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
          <p className="text-xs mt-2 text-gray-600">
            Assignments and comments on your issues will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([section, rows]) => (
            <section key={section}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">{section}</h2>
              <ul className="space-y-3">
                {rows.map((n) => {
                  const vis = notifVisual(n.type)
                  const Icon = vis.icon
                  const hasLink = Boolean(n.project_id && n.issue_id)
                  return (
                    <li key={n.notif_id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(n)}
                        className={`w-full text-left rounded-xl border p-4 transition-colors ${
                          n.is_read
                            ? 'border-[#d2f5fa]/10 bg-[#171c1d]/40 hover:border-[#78e5ef]/20'
                            : 'border-[#78e5ef]/25 bg-[#78e5ef]/5 hover:border-[#78e5ef]/40'
                        } ${hasLink ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${vis.box}`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] text-gray-500 truncate">
                                {n.project_name ? (
                                  <>
                                    {n.project_name}
                                    {n.issue_id ? (
                                      <>
                                        {' · '}
                                        <span className="text-[#78e5ef]/80">{formatIssueKey(n.issue_id)}</span>
                                      </>
                                    ) : null}
                                  </>
                                ) : (
                                  'DevTrack'
                                )}
                              </p>
                              <time
                                dateTime={n.created_at}
                                className="text-[11px] text-gray-500 shrink-0"
                              >
                                {relativeTime(n.created_at)}
                              </time>
                            </div>
                            <p className="text-sm text-gray-100 mt-2 leading-relaxed">
                              {n.triggered_by_username ? (
                                <span className="font-semibold text-white">{n.triggered_by_username}</span>
                              ) : null}
                              {n.triggered_by_username ? ' · ' : null}
                              {n.message}
                            </p>
                            {n.issue_title ? (
                              <p className="text-xs text-gray-500 mt-2 truncate" title={n.issue_title}>
                                {n.issue_title}
                              </p>
                            ) : null}
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

      <p className="text-xs text-gray-600">
        Open a notification with an issue to jump to that issue. Only notifications for your account are shown.
      </p>
    </div>
  )
}
