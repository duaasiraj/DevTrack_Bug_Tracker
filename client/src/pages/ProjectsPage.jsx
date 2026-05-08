import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, LayoutGrid, ChevronRight, Users, X, Trash2, Plus, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchProjectsForUser } from '../api/projectService'
import api from '../api/axios'
import { clearLastProjectIdIfMatch } from '../hooks/useLastProjectId'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [managingProjectId, setManagingProjectId] = useState(null)
  const [projectMembers, setProjectMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [memberRole, setMemberRole] = useState('developer')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)

  const canManageMembers = user?.role === 'admin' || user?.role === 'project_manager'
  const canCreateProject = user?.role === 'admin'

  function canDeleteProject(p) {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role !== 'project_manager') return false
    if (p.created_by != null && String(p.created_by) === String(user.user_id)) return true
    const role = p.project_role
    return role === 'project_manager' || role === 'project_lead'
  }

  // ── Create Project Modal State ──
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [pmSearch, setPmSearch] = useState('')
  const [pmResults, setPmResults] = useState([])
  const [pmSearching, setPmSearching] = useState(false)
  const [selectedPM, setSelectedPM] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!user) return
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const list = await fetchProjectsForUser(user)
        if (!cancelled) setProjects(list)
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/users/search', { params: { query: searchQuery } })
        if (!cancelled) setSearchResults(res.data.data || [])
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [searchQuery])

  useEffect(() => {
    if (!pmSearch.trim() || pmSearch.length < 2) { setPmResults([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      setPmSearching(true)
      try {
        const res = await api.get('/users/search', { params: { query: pmSearch } })
        if (!cancelled) setPmResults(res.data.data || [])
      } catch { if (!cancelled) setPmResults([]) }
      finally { if (!cancelled) setPmSearching(false) }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [pmSearch])

  function openCreateModal() {
    setShowCreateModal(true)
    setNewProjectName('')
    setNewProjectDesc('')
    setPmSearch('')
    setPmResults([])
    setSelectedPM(null)
    setCreateError('')
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    setCreateError('')
  }

  async function handleCreateProject() {
    if (!newProjectName.trim() || !selectedPM) return
    setCreating(true)
    setCreateError('')
    try {
      await api.post('/projects', {
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        projectManagerId: selectedPM.user_id,
      })
      const list = await fetchProjectsForUser(user)
      setProjects(list)
      closeCreateModal()
    } catch (e) {
      setCreateError(e.response?.data?.message || e.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  async function fetchMembers(projectId) {
    setMembersLoading(true)
    try {
      const res = await api.get(`/projects/${projectId}/members`)
      // Controller returns { success: true, data: [...] }
      const members = Array.isArray(res.data?.data) ? res.data.data : []
      setProjectMembers(members)
    } catch (err) {
      console.error('Failed to load members:', err.response?.data || err.message)
      setProjectMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  async function openPanel(projectId) {
    if (managingProjectId === projectId) { closePanel(); return }
    setManagingProjectId(projectId)
    setSearchQuery('')
    setSearchResults([])
    setSelectedUser(null)
    setMemberRole('developer')
    setAddError('')
    setAddSuccess('')
    setProjectMembers([])
    await fetchMembers(projectId)
  }

  function closePanel() {
    setManagingProjectId(null)
    setProjectMembers([])
  }

  function selectUser(u) {
    setSelectedUser(u)
    setSearchQuery(u.username)
    setSearchResults([])
  }

  async function handleAddMember(projectId) {
    if (!selectedUser) return
    setAdding(true)
    setAddError('')
    setAddSuccess('')
    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUser.user_id,
        projRole: memberRole,
      })
      setAddSuccess(`${selectedUser.username} added successfully.`)
      setSelectedUser(null)
      setSearchQuery('')
      await fetchMembers(projectId)
    } catch (e) {
      setAddError(e.response?.data?.message || e.message || 'Could not add member')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(projectId, userId, username) {
    if (!window.confirm(`Remove ${username} from this project?`)) return
    setRemoving(userId)
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`)
      await fetchMembers(projectId)
    } catch (e) {
      console.error('Could not remove member:', e.response?.data || e.message)
    } finally {
      setRemoving(null)
    }
  }

  async function handleDeleteProject(projectId, projectName) {
    if (
      !window.confirm(
        `Delete project “${projectName}”? All issues, comments, and activity for this project will be permanently removed. This cannot be undone.`,
      )
    ) {
      return
    }
    setDeletingId(projectId)
    setError('')
    try {
      await api.delete(`/projects/${projectId}`)
      clearLastProjectIdIfMatch(projectId)
      if (managingProjectId === projectId) closePanel()
      const list = await fetchProjectsForUser(user)
      setProjects(list)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not delete project')
    } finally {
      setDeletingId(null)
    }
  }

  function formatRole(role = '') {
    return role.replace(/_/g, ' ')
  }

  function memberIsManager(m) {
    return m.project_role === 'project_manager' || m.project_role === 'project_lead'
  }

  if (loading) return <div className="text-gray-400 text-sm p-10">Loading projects…</div>
  if (error) return <p className="text-red-400 text-sm p-10">{error}</p>

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 border-b border-[#d2f5fa]/10 pb-4">
        <div>
          <p className="text-xs text-[#78e5ef]/60 uppercase tracking-widest">Workspace</p>
          <h1 className="text-2xl font-bold text-white mt-1">Projects</h1>
          <p className="text-sm text-gray-400 mt-2">
            Open a project to manage issues on the board, create work items, and collaborate.
          </p>
        </div>
        {canCreateProject && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#78e5ef]/15 border border-[#78e5ef]/40 text-[#78e5ef] text-sm font-semibold hover:bg-[#78e5ef]/25 transition-colors shrink-0"
          >
            <Plus size={16} /> Add Project
          </button>
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCreateModal}
          />
          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl border border-[#d2f5fa]/15 bg-[#0d1517] shadow-2xl p-6 space-y-5 z-10">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Project</h2>
              <button onClick={closeCreateModal} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Project Name <span className="text-[#78e5ef]">*</span></label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. OS-level chat server"
                className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#78e5ef] placeholder-gray-600 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Description</label>
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Brief description of the project…"
                rows={3}
                className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#78e5ef] placeholder-gray-600 resize-none transition-colors"
              />
            </div>

            {/* Project Manager */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Project Manager <span className="text-[#78e5ef]">*</span></label>
              {selectedPM ? (
                <div className="flex items-center justify-between bg-[#78e5ef]/10 border border-[#78e5ef]/30 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[11px] font-bold">
                      {selectedPM.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{selectedPM.username}</p>
                      <p className="text-[11px] text-gray-500">{selectedPM.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPM(null); setPmSearch('') }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={pmSearch}
                    onChange={(e) => { setPmSearch(e.target.value); setSelectedPM(null) }}
                    placeholder="Search by username or email…"
                    className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#78e5ef] placeholder-gray-600 transition-colors"
                  />
                  {pmSearching && (
                    <span className="absolute right-3 top-3 text-xs text-gray-500">Searching…</span>
                  )}
                  {pmResults.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 rounded-lg border border-[#78e5ef]/20 bg-[#042124] shadow-xl overflow-hidden">
                      {pmResults.map((u) => (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedPM(u); setPmSearch(u.username); setPmResults([]) }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#78e5ef]/10 flex items-center justify-between text-white transition-colors"
                          >
                            <span>{u.username}</span>
                            <span className="text-xs text-gray-500">{u.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {createError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={closeCreateModal}
                className="flex-1 py-2.5 rounded-lg border border-[#d2f5fa]/15 text-gray-400 text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={creating || !newProjectName.trim() || !selectedPM}
                className="flex-1 py-2.5 rounded-lg bg-[#78e5ef]/20 border border-[#78e5ef]/40 text-[#78e5ef] text-sm font-semibold hover:bg-[#78e5ef]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-1">
        {projects.map((p) => (
          <li key={p.project_id} className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/80 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#78e5ef]/10 flex items-center justify-center text-[#78e5ef] shrink-0">
                  <FolderKanban size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-white truncate">
                    <Link
                      to={`/projects/${p.project_id}`}
                      className="hover:text-[#78e5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
                    >
                      {p.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">{p.description || 'No description'}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#78e5ef]/50 mt-2">
                    {p.status?.replace('_', ' ') ?? 'active'}
                    {p.project_role ? ` · ${formatRole(p.project_role)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to={`/projects/${p.project_id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#78e5ef]/40 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/10"
                >
                  <BarChart3 size={16} aria-hidden />
                  Details
                </Link>
                <Link
                  to={`/projects/${p.project_id}/board`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#78e5ef]/15 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/25"
                >
                  <LayoutGrid size={16} /> Board
                </Link>
                <Link
                  to={`/projects/${p.project_id}/issues/new`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#78e5ef]/30 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/10"
                >
                  New issue <ChevronRight size={16} />
                </Link>
                {canManageMembers && (
                  <button
                    onClick={() => openPanel(p.project_id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      managingProjectId === p.project_id
                        ? 'border-[#78e5ef]/60 bg-[#78e5ef]/15 text-[#78e5ef]'
                        : 'border-[#d2f5fa]/20 text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Users size={16} /> Members
                  </button>
                )}
                {canDeleteProject(p) && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteProject(p.project_id, p.name)}
                    disabled={deletingId === p.project_id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/35 text-red-300/90 text-sm font-medium hover:bg-red-500/15 disabled:opacity-45 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                  >
                    <Trash2 size={16} aria-hidden />
                    {deletingId === p.project_id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* ── Member Panel ── */}
            {managingProjectId === p.project_id && (
              <div className="border-t border-[#d2f5fa]/10 p-5 space-y-5 bg-[#0b1117]/40 rounded-b-xl">

                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Manage Members</p>
                  <button type="button" onClick={closePanel} className="text-gray-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Add member */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Add a member</p>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null) }}
                      placeholder="Search by username or email…"
                      className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#78e5ef] placeholder-gray-600"
                    />
                    {searching && (
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500">Searching…</span>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 rounded-lg border border-[#78e5ef]/20 bg-[#042124] shadow-xl overflow-hidden">
                        {searchResults.map((u) => (
                          <li key={u.user_id}>
                            <button
                              type="button"
                              onClick={() => selectUser(u)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[#78e5ef]/10 flex items-center justify-between text-white"
                            >
                              <span>{u.username}</span>
                              <span className="text-xs text-gray-500">{u.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="developer">Developer</option>
                      <option value="tester">Tester</option>
                      <option value="project_manager">Project Manager</option>
                    </select>
                    <button
                      onClick={() => handleAddMember(p.project_id)}
                      disabled={adding || !selectedUser}
                      className="flex-1 py-2 rounded-lg bg-[#78e5ef]/20 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/30 disabled:opacity-40 transition-colors"
                    >
                      {adding ? 'Adding…' : selectedUser ? `Add ${selectedUser.username}` : 'Select a user first'}
                    </button>
                  </div>

                  {addSuccess && (
                    <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                      {addSuccess}
                    </p>
                  )}
                  {addError && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                      {addError}
                    </p>
                  )}
                </div>

                {/* Members list */}
                <div className="pt-4 border-t border-[#d2f5fa]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Project Personnel</p>
                    <span className="text-xs text-[#78e5ef]/50">
                      {projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {membersLoading ? (
                    <div className="text-xs text-gray-500 py-6 text-center">Loading members…</div>
                  ) : projectMembers.length === 0 ? (
                    <div className="text-xs text-gray-600 py-6 text-center border border-dashed border-[#d2f5fa]/10 rounded-lg">
                      No members yet. Add someone above.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {projectMembers.map((m) => {
                        // getMembers controller returns "project_role" (not "proj_role")
                        const roleLabel = formatRole(m.project_role || '')
                        const managerStyle = memberIsManager(m)
                        const initials = (m.username || '??').substring(0, 2).toUpperCase()
                        const isCurrentUser = String(m.user_id) === String(user?.user_id)

                        return (
                          <div
                            key={m.user_id}
                            className="flex items-center justify-between bg-[#171c1d]/60 px-4 py-3 rounded-lg border border-[#d2f5fa]/5 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                managerStyle
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-[#78e5ef]/10 text-[#78e5ef]'
                              }`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {m.username}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-[9px] text-gray-500 font-normal">(you)</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-gray-500 capitalize">{roleLabel || 'member'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded border ${
                                managerStyle
                                  ? 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                                  : 'border-[#78e5ef]/20 text-[#78e5ef]/60 bg-[#78e5ef]/5'
                              }`}>
                                {roleLabel || 'member'}
                              </span>

                              {canManageMembers && !isCurrentUser && (
                                <button
                                  onClick={() => handleRemoveMember(p.project_id, m.user_id, m.username)}
                                  disabled={removing === m.user_id}
                                  title={`Remove ${m.username}`}
                                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all disabled:opacity-40 p-1 rounded"
                                >
                                  {removing === m.user_id
                                    ? <span className="text-[10px]">…</span>
                                    : <Trash2 size={13} />
                                  }
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
