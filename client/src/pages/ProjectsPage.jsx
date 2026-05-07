import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, LayoutGrid, ChevronRight, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchProjectsForUser } from '../api/projectService'
import api from '../api/axios'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // member panel state
  const [managingProjectId, setManagingProjectId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null) // { user_id, username, email }
  const [memberRole, setMemberRole] = useState('developer')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [adding, setAdding] = useState(false)

  const canManageMembers = user?.role === 'admin' || user?.role === 'project_manager'

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

  // search users as the admin types — fires after 2+ characters
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
    }, 300) // wait 300ms after typing stops before hitting the server
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  function openPanel(projectId) {
    // if clicking the same project, close it (toggle)
    if (managingProjectId === projectId) {
      closePanel()
      return
    }
    setManagingProjectId(projectId)
    setSearchQuery('')
    setSearchResults([])
    setSelectedUser(null)
    setMemberRole('developer')
    setAddError('')
    setAddSuccess('')
  }

  function closePanel() {
    setManagingProjectId(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedUser(null)
    setAddError('')
    setAddSuccess('')
  }

  function selectUser(u) {
    setSelectedUser(u)
    setSearchQuery(u.username) // fill the input so the user can see what they picked
    setSearchResults([])       // close the dropdown
  }

  async function handleAddMember(projectId) {
    if (!selectedUser) {
      setAddError('Please search for and select a user first.')
      return
    }
    setAdding(true)
    setAddError('')
    setAddSuccess('')
    try {
      // addMember on the server expects: { userId, projRole }
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUser.user_id,
        projRole: memberRole,
      })
      setAddSuccess(`${selectedUser.username} added as ${memberRole.replace('_', ' ')}.`)
      setSelectedUser(null)
      setSearchQuery('')
      setMemberRole('developer')
    } catch (e) {
      setAddError(e.response?.data?.message || e.message || 'Could not add member')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading projects…</div>
  if (error) return <p className="text-red-400 text-sm">{error}</p>

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
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-[#78e5ef]/10 bg-[#042124]/40 p-10 text-center text-gray-400">
          <FolderKanban className="mx-auto mb-3 text-[#78e5ef]/40" size={40} />
          <p>No projects yet. Ask an admin or project manager to add you to a project.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-1">
          {projects.map((p) => (
            <li
              key={p.project_id}
              className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/80 hover:border-[#78e5ef]/20 transition-colors"
            >
              {/* project card row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#78e5ef]/10 flex items-center justify-center text-[#78e5ef] shrink-0">
                    <FolderKanban size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-white truncate">{p.name}</h2>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                      {p.description || 'No description'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[#78e5ef]/50 mt-2">
                      {p.status?.replace('_', ' ') ?? 'active'}
                      {p.project_role ? ` · ${p.project_role}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link
                    to={`/projects/${p.project_id}/board`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#78e5ef]/15 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/25"
                  >
                    <LayoutGrid size={16} />
                    Board
                  </Link>

                  <Link
                    to={`/projects/${p.project_id}/issues/new`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#78e5ef]/30 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/10"
                  >
                    New issue
                    <ChevronRight size={16} />
                  </Link>

                  {/* only admin / project_manager see Members button */}
                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={() => openPanel(p.project_id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        managingProjectId === p.project_id
                          ? 'border-[#78e5ef]/60 bg-[#78e5ef]/15 text-[#78e5ef]'
                          : 'border-[#d2f5fa]/20 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Users size={16} />
                      Members
                    </button>
                  )}
                </div>
              </div>

              {/* member management panel — only shows when this project's button is clicked */}
              {managingProjectId === p.project_id && (
                <div className="border-t border-[#d2f5fa]/10 p-5 space-y-4 bg-[#0b1117]/40 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Add a member</p>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {addError && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                      {addError}
                    </p>
                  )}
                  {addSuccess && (
                    <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                      {addSuccess}
                    </p>
                  )}

                  {/* search input + results dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setSelectedUser(null) // clear selection if they type again
                        setAddSuccess('')
                      }}
                      placeholder="Search by username or email…"
                      className="w-full bg-[#042124] border border-[#78e5ef]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#78e5ef]"
                    />

                    {/* dropdown results */}
                    {searchResults.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 rounded-lg border border-[#78e5ef]/20 bg-[#042124] shadow-xl overflow-hidden">
                        {searchResults.map((u) => (
                          <li key={u.user_id}>
                            <button
                              type="button"
                              onClick={() => selectUser(u)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[#78e5ef]/10 flex items-center justify-between gap-2"
                            >
                              <span className="text-white">{u.username}</span>
                              <span className="text-xs text-gray-500">{u.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {searching && (
                      <p className="absolute right-3 top-2.5 text-xs text-gray-500">Searching…</p>
                    )}
                  </div>

                  {/* role picker + add button */}
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
                      type="button"
                      onClick={() => handleAddMember(p.project_id)}
                      disabled={adding || !selectedUser}
                      className="flex-1 py-2 rounded-lg bg-[#78e5ef]/20 text-[#78e5ef] text-sm font-medium hover:bg-[#78e5ef]/30 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {adding ? 'Adding…' : selectedUser ? `Add ${selectedUser.username}` : 'Select a user first'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}