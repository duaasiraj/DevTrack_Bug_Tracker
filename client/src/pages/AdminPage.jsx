import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { ClipboardList, ShieldAlert, UserPlus, Users, X } from 'lucide-react'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [usersModalOpen, setUsersModalOpen] = useState(false)

  useEffect(() => {
    if (!usersModalOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setUsersModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [usersModalOpen])

  async function refreshUsers() {
    setLoadError('')
    try {
      const res = await api.get('/users/')
      setUsers(Array.isArray(res.data.data) ? res.data.data : [])
    } catch (e) {
      setLoadError(e.response?.data?.message || e.message || 'Could not load users')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void refreshUsers()
  }, [])

  async function handleCreateUser(e) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!role) {
      setFormError('Select a system role.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/auth/register', { username, email, password, role })
      setFormSuccess(`User "${username}" was created. They can sign in with the password you set.`)
      setUsername('')
      setEmail('')
      setPassword('')
      setRole('')
      await refreshUsers()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-10 max-w-5xl dt-animate-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#78e5ef]/15 text-[#78e5ef]">
            <ShieldAlert size={22} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin panel</h1>
            <p className="text-sm text-gray-400 mt-1">Manage organization users and provisioning.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/activity-log"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#78e5ef]/30 text-sm font-medium text-[#78e5ef] bg-[#78e5ef]/5 hover:bg-[#78e5ef]/12 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40"
          >
            <ClipboardList size={18} aria-hidden />
            Activity log
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="text-[#78e5ef]" size={20} aria-hidden />
          <h2 className="text-lg font-semibold text-white">Add a user</h2>
        </div>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Create a new account for your organization. Share credentials securely with the new user so they can sign in at{' '}
          <Link to="/signin" className="text-[#78e5ef] hover:underline">
            Sign in
          </Link>
          .
        </p>

        {formError && (
          <p className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">{formError}</p>
        )}
        {formSuccess && (
          <p className="mb-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">{formSuccess}</p>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
          <div className="sm:col-span-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">System role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="mt-1 w-full bg-[#042124] border border-[#78e5ef]/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/35"
            >
              <option value="">Select role…</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="developer">Developer</option>
              <option value="tester">Tester</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#78e5ef] text-[#042124] text-sm font-semibold hover:bg-[#9eedf3] disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50"
            >
              {submitting ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Users</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
              Open the directory to see all accounts. Use the{' '}
              <span className="font-mono text-[#78e5ef]/80">User ID</span> on the sign-in page under &quot;Change password&quot; for resets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUsersModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d2f5fa]/15 text-sm font-medium text-gray-200 bg-[#171c1d]/60 hover:border-[#78e5ef]/35 hover:bg-[#171c1d] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 shrink-0"
          >
            <Users size={18} aria-hidden />
            View all users
            {!loadingUsers && users.length > 0 ? (
              <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{users.length}</span>
            ) : null}
          </button>
        </div>
        {loadError && <p className="text-sm text-red-300 mb-4">{loadError}</p>}
        {loadingUsers ? (
          <div className="h-20 rounded-2xl bg-[#171c1d]/80 animate-pulse" />
        ) : (
          <p className="text-sm text-gray-500">
            {users.length} user{users.length === 1 ? '' : 's'} in the organization.
          </p>
        )}
      </section>

      {usersModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-users-modal-title"
          onClick={() => setUsersModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[min(90vh,720px)] flex flex-col rounded-2xl border border-[#d2f5fa]/15 bg-[#0f1415] shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#d2f5fa]/10 shrink-0">
              <h2 id="admin-users-modal-title" className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="text-[#78e5ef]" size={20} aria-hidden />
                All users
              </h2>
              <button
                type="button"
                onClick={() => setUsersModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40"
                aria-label="Close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4 sm:p-5">
              {loadError ? (
                <p className="text-sm text-red-300">{loadError}</p>
              ) : loadingUsers ? (
                <div className="h-40 rounded-xl bg-[#171c1d]/80 animate-pulse" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#d2f5fa]/10 bg-[#0b1117]/50">
                  <table className="w-full min-w-[720px] text-sm text-left">
                    <thead>
                      <tr className="border-b border-[#d2f5fa]/10 text-[10px] uppercase tracking-wider text-gray-500 bg-[#171c1d]/80">
                        <th className="px-4 py-3 font-semibold">Username</th>
                        <th className="px-4 py-3 font-semibold">User ID</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d2f5fa]/8">
                      {users.map((u) => (
                        <tr key={u.user_id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                          <td
                            className="px-4 py-3 text-[10px] font-mono text-[#78e5ef]/80 max-w-[200px] truncate"
                            title={u.user_id}
                          >
                            {u.user_id}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{u.email}</td>
                          <td className="px-4 py-3 text-gray-300 capitalize">{String(u.role || '').replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
