import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, LayoutGrid, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchProjectsForUser } from '../api/projectService'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading projects…</div>
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

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
          <p>No projects yet. Ask an admin or project manager to add you to a project, or create one if you have access.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-1">
          {projects.map((p) => (
            <li
              key={p.project_id}
              className="rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/80 hover:border-[#78e5ef]/30 transition-colors"
            >
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
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
