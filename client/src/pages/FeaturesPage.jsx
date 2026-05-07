import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { Shield, GitBranch, Layout, Filter, Bell, MessageSquare, ArrowLeft } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: 'Granular permissions so admins, project managers, developers, and testers each see what they need—nothing more, nothing less.',
  },
  {
    icon: GitBranch,
    title: 'Issue Lifecycle',
    desc: 'Track work from Open through In Progress, Resolved, and Closed with clear ownership and history.',
  },
  {
    icon: Layout,
    title: 'Project Management',
    desc: 'Organize issues by project, keep members aligned, and keep every bug or task in one trusted place.',
  },
  {
    icon: Filter,
    title: 'Smart Filtering',
    desc: 'Slice the board by status, priority, type, and search so large backlogs stay manageable.',
  },
  {
    icon: Bell,
    title: 'In-App Notifications',
    desc: 'Get nudges for assignments, comments, and status changes—without leaving the app.',
  },
  {
    icon: MessageSquare,
    title: 'Comment Threads',
    desc: 'Keep discussion next to the issue so context never drifts into chat or email.',
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0f1415]">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#78e5ef] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/50 rounded-lg px-1 py-1 -ml-1"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to home
        </Link>
        <header className="mt-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#78e5ef]/70">Features</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white">Built for disciplined issue tracking</h1>
          <p className="mt-4 text-gray-400 leading-relaxed">
            DevTrack focuses on clarity and role-aware workflows—ideal for internal teams who outgrew spreadsheets and ad-hoc chat.
          </p>
        </header>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group rounded-2xl border border-white/[0.06] bg-[#171c1d]/80 p-6 shadow-lg shadow-black/20 transition-all duration-300 hover:border-[#78e5ef]/25 hover:shadow-xl hover:shadow-black/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#78e5ef]/10 text-[#78e5ef] transition-colors group-hover:bg-[#78e5ef]/15">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
