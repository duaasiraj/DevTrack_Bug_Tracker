import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Loader2, MessageSquare, RefreshCw, UserPlus } from 'lucide-react'
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
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function iconFor(type) {
  switch (type) {
    case 'assigned':
      return UserPlus
    case 'commented':
      return MessageSquare
    case 'status_changed':
      return RefreshCw
    default:
      return Bell
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    api
      .get('/notifications/')
      .then((r) => {
        if (!cancelled) setItems(Array.isArray(r.data.data) ? r.data.data : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    api
      .get('/notifications/')
      .then((r) => {
        if (!cancelled) setItems(Array.isArray(r.data.data) ? r.data.data : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const preview = items.slice(0, 8)
  const unreadCount = items.filter((n) => !n.is_read).length

  async function openOne(n) {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.notif_id}/read`)
        setItems((prev) => prev.map((x) => (x.notif_id === n.notif_id ? { ...x, is_read: true } : x)))
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    if (n.project_id && n.issue_id) {
      navigate(`/projects/${n.project_id}/issues/${n.issue_id}`)
    }
  }

  return (
    <div className="relative z-50" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/80 text-gray-300 transition-all hover:border-[#78e5ef]/30 hover:bg-[#78e5ef]/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50 disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#78e5ef] px-1 text-[10px] font-bold text-[#042124]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed left-3 right-3 top-16 z-50 max-h-[min(70vh,420px)] overflow-hidden rounded-2xl border border-[#d2f5fa]/10 bg-[#0f1415] shadow-2xl shadow-black/50 dt-animate-in lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[min(100vw-2rem,380px)] lg:max-h-[min(70vh,440px)]"
            role="dialog"
            aria-label="Notifications preview"
          >
            <div className="flex items-center justify-between border-b border-[#d2f5fa]/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <Link
                to="/notifications"
                className="text-xs font-medium text-[#78e5ef] hover:text-[#9eedf3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded px-1"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
            <div className="max-h-[min(60vh,360px)] overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={18} aria-hidden />
                  Loading…
                </div>
              ) : preview.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-[#78e5ef]/20" aria-hidden />
                  You are all caught up.
                </div>
              ) : (
                <ul className="divide-y divide-[#d2f5fa]/5">
                  {preview.map((n) => {
                    const Icon = iconFor(n.type)
                    const unread = !n.is_read
                    return (
                      <li key={n.notif_id}>
                        <button
                          type="button"
                          onClick={() => void openOne(n)}
                          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.06] ${
                            unread ? 'bg-[#78e5ef]/[0.06]' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                              unread
                                ? 'border-[#78e5ef]/30 bg-[#78e5ef]/10 text-[#78e5ef]'
                                : 'border-[#d2f5fa]/10 bg-[#171c1d] text-gray-400'
                            }`}
                          >
                            <Icon size={16} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="truncate text-[11px] text-gray-500">
                                {n.project_name ?? 'DevTrack'}
                                {n.issue_id ? (
                                  <>
                                    {' · '}
                                    <span className="text-[#78e5ef]/80">{formatIssueKey(n.issue_id)}</span>
                                  </>
                                ) : null}
                              </span>
                              <time className="shrink-0 text-[10px] text-gray-600" dateTime={n.created_at}>
                                {relativeTime(n.created_at)}
                              </time>
                            </span>
                            <span className="mt-1 line-clamp-2 text-xs text-gray-200">{n.message}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
