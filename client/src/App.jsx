import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Sign_in from './pages/Sign_in'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectsPage from './pages/ProjectsPage'
import IssueBoardPage from './pages/IssueBoardPage'
import IssueCreatePage from './pages/IssueCreatePage'
import IssueDetailPage from './pages/IssueDetailPage'
import NotificationsPage from './pages/NotificationsPage'

// layout wrapper — sidebar + header, renders child routes via Outlet
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="flex min-h-screen bg-[#0f1415]">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#171c1d]/80 backdrop-blur-md border-b border-[#dfe3e4]/5 flex items-center px-4 lg:hidden">
          <button onClick={toggleSidebar} className="text-[#78e5ef] p-2">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 lg:ml-64 p-8">
          <Outlet />  {/* ← each page renders here */}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<Sign_in />} />
      <Route path="/register" element={<Register />} />

      {/* protected routes — all roles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/board" element={<IssueBoardPage />} />
          <Route path="/projects/:projectId/issues/new" element={<IssueCreatePage />} />
          <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetailPage />} />
          <Route path="/issues" element={<Navigate to="/projects" replace />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* admin only */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<AppLayout />}>
          <Route path="/register" element={<Register />} />
        </Route>
      </Route>

    </Routes>
  )
}

export default App