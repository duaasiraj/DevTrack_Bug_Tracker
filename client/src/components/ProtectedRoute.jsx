import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <div
          className="h-8 w-8 rounded-full border-2 border-[#78e5ef]/25 border-t-[#78e5ef] animate-spin"
          aria-hidden
        />
        <p className="text-sm">Loading session…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/signin" />

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" />
  }

  return <Outlet />
}