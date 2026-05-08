import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Briefcase, Code2, FlaskConical } from 'lucide-react'

const roles = [
  {
    icon: Shield,
    title: 'Admin',
    summary: 'Full system access for your organization.',
    points: [
      'Manage user accounts and roles',
      'Create and retire projects',
      'Assign project membership',
      'View system-wide activity',
    ],
  },
  {
    icon: Briefcase,
    title: 'Project Manager',
    summary: 'Owns delivery for a specific project.',
    points: [
      'Add project members',
      'Create and assign issues',
      'Update status and close work when appropriate',
      'Monitor progress across the team',
    ],
  },
  {
    icon: Code2,
    title: 'Developer',
    summary: 'Executes work on assigned issues.',
    points: [
      'Create issues in their projects',
      'View and update assigned issues and ones they reported',
      'Move status along the lifecycle where allowed',
      'Comment with implementation context',
      'Use a focused personal queue on the board',
    ],
  },
  {
    icon: FlaskConical,
    title: 'Tester',
    summary: 'Reports quality issues and validates fixes.',
    points: [
      'Create and describe bugs clearly',
      'Comment and collaborate on reproduction',
      'Reopen resolved issues if problems return',
      'Track everything they have reported',
    ],
  },
]

export default function RolesPage() {
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#78e5ef]/70">Roles</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white">The right view for every teammate</h1>
          <p className="mt-4 text-gray-400 leading-relaxed">
            DevTrack is designed for small internal teams: each role gets permissions that match how they actually contribute—without noisy extras.
          </p>
        </header>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {roles.map(({ icon: Icon, title, summary, points }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#171c1d]/90 to-[#0f1415]/90 p-6 sm:p-8 shadow-lg shadow-black/25"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#78e5ef]/10 text-[#78e5ef]">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-sm text-gray-400">{summary}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-300">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#78e5ef]/60" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
