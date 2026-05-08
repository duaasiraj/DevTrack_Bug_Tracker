import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Routes, Route, Outlet } from 'react-router-dom'
import Landing from './pages/Landing'
import Sign_in from './pages/Sign_in'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Sidebar from './components/Sidebar'
import NotificationBell from './components/NotificationBell'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectsPage from './pages/ProjectsPage'
import IssueBoardPage from './pages/IssueBoardPage'
import IssueCreatePage from './pages/IssueCreatePage'
import IssueDetailPage from './pages/IssueDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import AllIssuesPage from './pages/AllIssuesPage'
import AdminPage from './pages/AdminPage'
import AdminActivityLogPage from './pages/AdminActivityLogPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectIssueLogPage from './pages/ProjectIssueLogPage'
import FeaturesPage from './pages/FeaturesPage'
import RolesPage from './pages/RolesPage'
import AboutUsPage from './pages/AboutUsPage'

// layout wrapper — sidebar + header, renders child routes via Outlet
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="flex min-h-screen bg-[#0f1415]">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 shrink-0 bg-[#171c1d]/90 backdrop-blur-md border-b border-[#dfe3e4]/5 flex items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden text-[#78e5ef] p-2 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="hidden lg:block flex-1" aria-hidden />
          <NotificationBell />
        </header>

        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
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
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/roles" element={<RolesPage />} />
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/signin" element={<Sign_in />} />
      <Route path="/register" element={<Register />} />

      {/* protected routes — all roles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/board" element={<IssueBoardPage />} />
          <Route path="/projects/:projectId/issue-log" element={<ProjectIssueLogPage />} />
          <Route path="/projects/:projectId/issues/new" element={<IssueCreatePage />} />
          <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetailPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/issues" element={<AllIssuesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/activity-log" element={<AdminActivityLogPage />} />
        </Route>
      </Route>

    </Routes>
  )
}

export default App