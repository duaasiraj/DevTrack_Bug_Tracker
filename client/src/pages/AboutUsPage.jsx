import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'

const team = [
  {
    id: '24K-0524',
    name: 'Team member',
    role: 'Backend & data modeling',
    bio: 'Focused on reliable APIs, PostgreSQL, and keeping issue history auditable. Enjoys turning messy spreadsheets into structured workflows.',
  },
  {
    id: '24K-0667',
    name: 'Team member',
    role: 'Frontend & UX',
    bio: 'Care about clear information hierarchy on the board and issue pages—especially for developers scanning their queue between commits.',
  },
  {
    id: '24K-0537',
    name: 'Team member',
    role: 'Integration & quality',
    bio: 'Bridges requirements from admins and PMs with day-to-day testing flows, making sure notifications and permissions feel predictable.',
  },
]

export default function AboutUsPage() {
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

        <header className="mt-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#78e5ef]/20 bg-[#78e5ef]/5 px-4 py-1.5 text-xs font-medium text-[#78e5ef]">
            <Users className="h-3.5 w-3.5" aria-hidden />
            About us
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-white">The team behind DevTrack</h1>
          <p className="mt-4 text-gray-400 leading-relaxed">
            We built DevTrack as a Database Systems course project: a practical issue tracker for small orgs that need structure more than heavyweight enterprise tooling.
          </p>
        </header>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {team.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-white/[0.06] bg-[#171c1d]/70 p-6 text-center transition-transform duration-300 hover:-translate-y-0.5 hover:border-[#78e5ef]/20"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#78e5ef]/20 to-[#042124] text-lg font-bold text-[#78e5ef]">
                {m.id.slice(-2)}
              </div>
              <p className="mt-4 text-xs font-mono text-[#78e5ef]/70">{m.id}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{m.name}</h2>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{m.role}</p>
              <p className="mt-4 text-sm text-gray-400 leading-relaxed text-left">{m.bio}</p>
            </article>
          ))}
        </div>

        <p className="mt-16 text-center text-sm text-gray-500 max-w-xl mx-auto">
          Database Systems — Project Proposal · DevTrack is scoped as an internal tool: no public self-serve signup, no file storage, and no third-party integrations in v1.
        </p>
      </div>
    </div>
  )
}
