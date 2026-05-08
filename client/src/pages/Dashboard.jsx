import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  LayoutDashboard,
  Users,
  Bug,
  HeartPulse,
  ShieldAlert,
  FolderKanban,
  LogOut,
  UserCheck,
  Settings,
  Trash2,
  ListTodo,
  UserPlus,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { ISSUE_STATUSES, statusLabel, priorityLabel } from '../constants/issueEnums'

const CHART_COLORS = {
  open: '#38bdf8',
  in_progress: '#a78bfa',
  resolved: '#34d399',
  closed: '#6b7280',
}

function formatRole(role) {
  if (!role) return ''
  return String(role).replace(/_/g, ' ')
}

function truncate(str, n = 28) {
  if (!str) return ''
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`
}

function DashboardSkeleton({ variant = 'overview' }) {
  const member = variant === 'member'
  return (
    <div className="max-w-6xl space-y-8 pb-10">
      <div className="flex justify-between gap-4 border-b border-[#d2f5fa]/10 pb-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-[#171c1d] animate-pulse" />
          <div className="h-9 w-64 max-w-full rounded-lg bg-[#171c1d] animate-pulse" />
          <div className="h-4 w-48 rounded bg-[#171c1d]/80 animate-pulse" />
        </div>
        <div className="h-10 w-28 shrink-0 rounded-lg bg-[#171c1d] animate-pulse mt-1" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 animate-pulse"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 animate-pulse" />
        <div className="h-80 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 animate-pulse" />
      </div>
      {member ? (
        <div className="h-64 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 animate-pulse" />
      ) : (
        <div className="h-56 rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/40 animate-pulse" />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/70 p-5 shadow-sm backdrop-blur-sm transition-colors hover:border-[#78e5ef]/25">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {Icon ? <Icon className={`h-5 w-5 shrink-0 ${accent || 'text-[#78e5ef]/70'}`} aria-hidden /> : null}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-white tracking-tight">{value ?? '—'}</p>
      {sub ? <p className="mt-2 text-xs text-gray-500 leading-snug">{sub}</p> : null}
    </div>
  )
}

export default function Dashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'developer'
  const roleLabel = formatRole(role)
  const roleTitle = roleLabel ? roleLabel.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Member'

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [stats, setStats] = useState(null)
  const [dbUsers, setDbUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const isAdmin = role === 'admin'
  const isPm = role === 'project_manager'
  const overview = stats?.view === 'overview'

  async function fetchDashboard() {
    setLoadError('')
    setLoading(true)
    try {
      const dashRes = await api.get('/stats/dashboard')
      const d = dashRes.data?.data
      setStats(d || null)

      if (isAdmin) {
        const usersRes = await api.get('/admin/users')
        setDbUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : [])
      } else {
        setDbUsers([])
      }
    } catch (e) {
      setLoadError(e.response?.data?.message || e.message || 'Could not load dashboard')
      setStats(null)
      setDbUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.user_id) void fetchDashboard()
  }, [user?.user_id, isAdmin])

  const statusPieData = useMemo(() => {
    if (!stats?.byStatus) return []
    return ISSUE_STATUSES.map((s) => ({
      name: s.label,
      value: stats.byStatus[s.value] ?? 0,
      key: s.value,
      fill: CHART_COLORS[s.value] || '#64748b',
    })).filter((x) => x.value > 0)
  }, [stats])

  const projectsBarData = useMemo(() => {
    const rows = stats?.projectsChart
    if (!Array.isArray(rows)) return []
    return rows.map((r) => ({
      name: truncate(r.name, 22),
      fullName: r.name,
      issues: r.issueCount ?? 0,
    }))
  }, [stats])

  async function handleUpdateRole(userId, roleToSet) {
    const raw = roleToSet || selectedUser?.role || 'developer'
    const finalRole = String(raw).trim().toLowerCase().replace(/\s+/g, '_')
    try {
      await api.put(`/admin/users/${userId}/role`, { role: finalRole })
      setSuccessMsg(`Role updated for ${selectedUser?.username}.`)
      setTimeout(() => {
        setSuccessMsg('')
        setIsModalOpen(false)
        setNewRole('')
        void fetchDashboard()
      }, 1500)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      setIsModalOpen(false)
      void fetchDashboard()
    } catch (e) {
      console.error(e)
    }
  }

  if (!user) return null

  if (loading) {
    const skel = role === 'developer' || role === 'tester' ? 'member' : 'overview'
    return (
      <div className="max-w-6xl dt-animate-in">
        <DashboardSkeleton variant={skel} />
      </div>
    )
  }

  if (loadError || !stats) {
    return (
      <div className="max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
        <p className="text-sm text-amber-200">{loadError || 'No statistics available.'}</p>
        <button
          type="button"
          onClick={() => void fetchDashboard()}
          className="mt-4 text-sm font-medium text-[#78e5ef] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const healthLabel = `${stats.healthPercent}%`
  const usersRows = Array.isArray(stats.usersTable) ? stats.usersTable : []
  const pendingList = Array.isArray(stats.pendingIssues) ? stats.pendingIssues : []
  const pendingShown = pendingList.length
  const pendingTotal = stats.pendingCount ?? pendingShown

  return (
    <div className="max-w-6xl space-y-8 pb-10 dt-animate-in">
      <div className="flex flex-col gap-4 border-b border-[#d2f5fa]/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#78e5ef]/70">
            Workspace
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            {isAdmin && <ShieldAlert className="text-red-400 shrink-0" size={26} aria-hidden />}
            <span>{roleTitle} dashboard</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Signed in as <span className="font-medium text-white">{user.username}</span>
            {overview && isAdmin && ' · Organization overview'}
            {overview && isPm && ' · Projects you manage or lead'}
            {!overview && ' · Your assignments and project scope'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d2f5fa]/15 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <FolderKanban size={18} aria-hidden />
            Projects
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/signin')
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} aria-hidden />
            Sign out
          </button>
        </div>
      </div>

      {overview ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={isPm ? 'Managed projects' : 'Projects'}
              value={stats.projects}
              sub={isPm ? 'Where you are lead or PM' : 'All workspaces'}
              icon={LayoutDashboard}
            />
            <StatCard
              label={isPm ? 'Team on those projects' : 'Users'}
              value={stats.teamMembers}
              sub={isPm ? 'Members in scope' : 'Accounts in the organization'}
              icon={Users}
            />
            <StatCard
              label="Issues in scope"
              value={stats.issues}
              sub={`${stats.activeIssues} active · ${stats.solvedIssues} done`}
              icon={Bug}
              accent="text-amber-400/90"
            />
            <StatCard
              label="Health"
              value={healthLabel}
              sub="Resolved + closed vs total in scope"
              icon={HeartPulse}
              accent="text-emerald-400/90"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="text-[#78e5ef]/80" size={18} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">Issues by status</h2>
                  <p className="text-xs text-gray-500">All issues in your visibility scope</p>
                </div>
              </div>
              <div className="h-72 w-full min-w-0">
                {stats.issues === 0 || statusPieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    No issues in scope yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {statusPieData.map((x) => (
                          <Cell key={x.key} fill={x.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#0f1415',
                          border: '1px solid rgba(210,245,250,0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                        formatter={(value) => <span className="text-gray-400">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FolderKanban className="text-amber-400/80" size={18} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">Projects and issue load</h2>
                  <p className="text-xs text-gray-500">Total issues per project</p>
                </div>
              </div>
              <div className="h-72 w-full min-w-0">
                {projectsBarData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    No projects in scope.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={projectsBarData}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3f3f" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={108}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0f1415',
                          border: '1px solid rgba(210,245,250,0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(v, _n, p) => [v, 'Issues']}
                        labelFormatter={(_l, p) => p?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="issues" fill="#38bdf8" radius={[0, 6, 6, 0]} name="Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d2f5fa]/10 bg-[#0b1117]/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <UserCheck className="text-[#78e5ef]" size={20} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {isPm ? 'People on your projects' : 'Users'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isPm
                      ? 'Open + in progress issues where they report or are assigned (scoped to your projects)'
                      : 'Open + in progress issues tied to each person · Admin can manage roles'}
                  </p>
                </div>
              </div>
              <Settings className="text-gray-600" size={18} aria-hidden />
            </div>
            <div className="overflow-x-auto">
              {usersRows.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No people in scope.</p>
              ) : (
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d2f5fa]/10 text-[11px] uppercase tracking-wider text-gray-500 bg-[#0b1117]/40">
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Role</th>
                      <th className="px-6 py-3 font-semibold tabular-nums">Open issues</th>
                      {isAdmin ? <th className="px-6 py-3 font-semibold text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2f5fa]/8">
                    {usersRows.map((row) => {
                      const dbu = isAdmin
                        ? dbUsers.find((u) => String(u.user_id) === String(row.userId))
                        : null
                      return (
                        <tr key={row.userId} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">{row.username}</p>
                            <p className="text-xs text-gray-500">{row.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-md border border-[#78e5ef]/20 bg-[#78e5ef]/10 px-2.5 py-1 text-xs capitalize text-[#78e5ef]">
                              {formatRole(row.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 tabular-nums text-gray-200">
                            {row.openIssues ?? 0}
                          </td>
                          {isAdmin ? (
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                disabled={!dbu}
                                onClick={() => {
                                  if (!dbu) return
                                  setSelectedUser(dbu)
                                  setIsModalOpen(true)
                                }}
                                className="rounded-lg border border-[#78e5ef]/35 px-3 py-1.5 text-xs font-medium text-[#78e5ef] hover:bg-[#78e5ef]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Manage
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Your projects"
              value={stats.projects}
              sub="Teams you belong to"
              icon={LayoutDashboard}
            />
            <StatCard
              label="Opened by you"
              value={stats.openedCount ?? 0}
              sub="Issues you reported"
              icon={UserPlus}
              accent="text-sky-400/90"
            />
            <StatCard
              label="Assigned to you"
              value={stats.assignedCount ?? 0}
              sub="Issues you own"
              icon={UserCheck}
              accent="text-violet-400/90"
            />
            <StatCard
              label="Pending"
              value={pendingTotal}
              sub={
                role === 'tester'
                  ? 'Open + in progress in your projects'
                  : 'Open + in progress you’re on'
              }
              icon={ListTodo}
              accent="text-amber-400/90"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
            <StatCard
              label={role === 'tester' ? 'Issues in your projects' : 'Your footprint'}
              value={stats.issues ?? 0}
              sub={
                role === 'tester'
                  ? 'All issues in scoped projects'
                  : 'Issues you report or are assigned to'
              }
              icon={Bug}
              accent="text-amber-400/90"
            />
            <StatCard
              label="Health (your slice)"
              value={healthLabel}
              sub={
                role === 'tester'
                  ? 'Resolved + closed vs all in your projects'
                  : 'Among issues you touch'
              }
              icon={HeartPulse}
              accent="text-emerald-400/90"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="text-[#78e5ef]/80" size={18} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">Issues by status</h2>
                  <p className="text-xs text-gray-500">
                    {role === 'tester'
                      ? 'All issues in your projects'
                      : 'Issues you reported or are assigned to'}
                  </p>
                </div>
              </div>
              <div className="h-72 w-full min-w-0">
                {(stats.issues ?? 0) === 0 || statusPieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    No issues in scope yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {statusPieData.map((x) => (
                          <Cell key={x.key} fill={x.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#0f1415',
                          border: '1px solid rgba(210,245,250,0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                        formatter={(value) => <span className="text-gray-400">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/60 p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FolderKanban className="text-amber-400/80" size={18} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {role === 'tester' ? 'Per-project issue volume' : 'Your issues by project'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {role === 'tester'
                      ? 'Total issues in each project you belong to'
                      : 'Issues you report or are assigned, grouped by project'}
                  </p>
                </div>
              </div>
              <div className="h-72 w-full min-w-0">
                {projectsBarData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-gray-500">
                    No project data yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={projectsBarData}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3f3f" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={108}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0f1415',
                          border: '1px solid rgba(210,245,250,0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(v) => [v, 'Issues']}
                        labelFormatter={(_l, p) => p?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="issues" fill="#a78bfa" radius={[0, 6, 6, 0]} name="Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/50 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#d2f5fa]/10 bg-[#0b1117]/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <ListTodo className="text-amber-400/90" size={20} aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-white">Pending issues</h2>
                  <p className="text-xs text-gray-500">
                    Open and in progress
                    {pendingShown < pendingTotal
                      ? ` · Showing ${pendingShown} of ${pendingTotal}`
                      : pendingTotal
                        ? ` · ${pendingTotal} total`
                        : ''}
                  </p>
                </div>
              </div>
            </div>
            {pendingShown === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">Nothing pending right now.</p>
            ) : (
              <ul className="divide-y divide-[#d2f5fa]/8">
                {pendingList.map((row) => (
                  <li key={row.issueId} className="px-6 py-4 hover:bg-white/[0.02]">
                    <Link
                      to={`/projects/${row.projectId}/issues/${row.issueId}`}
                      className="block group"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-white group-hover:text-[#78e5ef] transition-colors">
                          {row.title}
                        </p>
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">
                          {row.projectName}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-gray-400">
                          {statusLabel(row.status)}
                        </span>
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-gray-400">
                          Prio: {priorityLabel(row.priority)}
                        </span>
                        {row.reportedBy === user.user_id ? (
                          <span className="text-sky-400/90">You reported</span>
                        ) : null}
                        {row.assignedTo === user.user_id ? (
                          <span className="text-violet-400/90">Assigned to you</span>
                        ) : null}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-2xl border border-[#d2f5fa]/15 bg-[#0f1415] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-[#78e5ef]">
              Edit user
            </h3>
            <p className="mt-2 border-b border-[#d2f5fa]/10 pb-4 text-center text-xs text-gray-500">
              {selectedUser.username} · <span className="font-mono text-gray-400">{selectedUser.user_id}</span>
            </p>

            {successMsg && (
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-200">
                {successMsg}
              </p>
            )}

            <div className="mt-6 space-y-4">
              <select
                className="w-full rounded-xl border border-[#78e5ef]/20 bg-[#042124] px-4 py-3 text-sm text-white outline-none focus:border-[#78e5ef]/50"
                onChange={(e) => setNewRole(e.target.value)}
                defaultValue={selectedUser.role || 'developer'}
              >
                <option value="admin">Admin</option>
                <option value="project_manager">Project manager</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
              </select>
              <button
                type="button"
                onClick={() => handleUpdateRole(selectedUser.user_id, newRole || selectedUser.role)}
                className="w-full rounded-xl bg-[#78e5ef] py-3 text-sm font-semibold text-[#042124] hover:bg-[#9eedf3]"
              >
                Save role
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(selectedUser.user_id)}
                className="flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-red-400/90 hover:text-red-300"
              >
                <Trash2 size={14} aria-hidden />
                Delete user
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
