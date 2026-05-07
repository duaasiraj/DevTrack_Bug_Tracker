import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react'
import api from '../api/axios'
import { formatIssueKey } from '../utils/issueDisplay'

function formatAction(a) {
  if (!a) return '—'
  return String(a).replace(/_/g, ' ')
}

export default function AdminActivityLogPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const r = await api.get('/admin/activity-log')
        if (cancelled) return
        setRows(Array.isArray(r.data.data) ? r.data.data : [])
      } catch (e) {
        if (cancelled) return
        setError(e.response?.data?.message || e.message || 'Could not load activity log')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8 max-w-6xl dt-animate-in pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d2f5fa]/10 pb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#78e5ef]/15 text-[#78e5ef] shrink-0">
            <ClipboardList size={22} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System activity log</h1>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Issues, comments, assignments, and project events across the organization.
            </p>
          </div>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#78e5ef] hover:text-[#9eedf3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded-lg px-2 py-1"
        >
          <ArrowLeft size={18} aria-hidden />
          Admin panel
        </Link>
      </div>

      {error && (
        <p className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
          <Loader2 className="animate-spin" size={20} aria-hidden />
          Loading activity…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#d2f5fa]/10 bg-[#0b1117]/50">
          <table className="w-full min-w-[900px] text-sm text-left">
            <thead>
              <tr className="border-b border-[#d2f5fa]/10 text-[10px] uppercase tracking-wider text-gray-500 bg-[#171c1d]/80">
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Time</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Issue</th>
                <th className="px-4 py-3 font-semibold min-w-[200px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d2f5fa]/8">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.log_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap tabular-nums">
                      {r.performed_at
                        ? new Date(r.performed_at).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{formatAction(r.action_performed)}</td>
                    <td className="px-4 py-3 text-gray-400">{r.actor_username ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate" title={r.project_name || ''}>
                      {r.project_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.issue_id ? (
                        <span className="font-mono text-[11px] text-[#78e5ef]/90">{formatIssueKey(r.issue_id)}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-md">
                      <div className="line-clamp-2" title={r.details || ''}>
                        {r.details ?? '—'}
                      </div>
                      {r.issue_title ? (
                        <div className="text-[10px] text-gray-600 mt-1 truncate" title={r.issue_title}>
                          {r.issue_title}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
