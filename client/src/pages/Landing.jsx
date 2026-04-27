import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { Shield, GitBranch, Layout, Filter, Bell, MessageSquare } from 'lucide-react'

const features = [
  {
    icon: <Shield className="w-7 h-7 text-indigo-400" />,
    title: "Role-Based Access",
    desc: "Granular permissions ensure right people have right access level across all projects.",
  },
  {
    icon: <GitBranch className="w-7 h-7 text-indigo-400" />,
    title: "Issue Lifecycle",
    desc: "Customize workflows to match how your team actually builds and ships software.",
  },
  {
    icon: <Layout className="w-7 h-7 text-indigo-400" />,
    title: "Project Management",
    desc: "Organize issues into cycles, projects, and custom views tailored to your process.",
  },
  {
    icon: <Filter className="w-7 h-7 text-indigo-400" />,
    title: "Smart Filtering",
    desc: "Find anything instantly with powerful, combinable filters and saved views.",
  },
  {
    icon: <Bell className="w-7 h-7 text-indigo-400" />,
    title: "In-App Notifications",
    desc: "Stay focused with an intelligent inbox that only alerts you to what matters.",
  },
  {
    icon: <MessageSquare className="w-7 h-7 text-indigo-400" />,
    title: "Comment Threads",
    desc: "Keep context attached to the work with inline discussions and rich text formatting.",
  },
]

function Landing() {
  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section
        style={{ background: "radial-gradient(circle at center, #0f4c4c 0%, #0f172a 70%)" }}
        className="w-full min-h-screen"
      >
        <div className="flex items-center justify-between gap-12 py-32 pl-24 pr-12">

          {/* Left */}
          <div className="flex-1 flex flex-col">
            <div className="inline-flex items-center gap-2 bg-teal-900/50 text-teal-400 text-sm px-3 py-1 rounded-full mb-6 w-fit">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>DevTrack is now live</span>
            </div>

            <h1 className="text-8xl font-bold text-white leading-tight mb-4">
              Track every bug.<br />
              Ship with<br />
              <span className="font-bold text-teal-400">
                confidence.
              </span>
            </h1>
            <p className="text-gray-400 text-xl mb-10">
              A simple issue tracker built for fast paced software development teams. Streamline your workflow, manage complex projects and deploy faster. QA testers, project managers, developers, all in one place.
            </p>
            <div className="flex gap-5">
              <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl transition text-xl font-bold">
                Start building →
              </Link>
              <button className="border border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-sm text-blue-300 hover:text-white px-8 py-4 rounded-xl transition text-xl font-bold">
                Book a demo
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-[650px]">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-4 rounded-full bg-slate-600"></div>
                <div className="w-3 h-4 rounded-full bg-slate-600"></div>
                <div className="w-3 h-4 rounded-full bg-slate-600"></div>
              </div>
              <div className="h-4 bg-slate-700 rounded w-2/3 mb-4"></div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-3 w-2/5">
                  <div className="h-5 bg-slate-700 w-full"></div>
                  <div className="h-5 bg-slate-700 w-4/5"></div>
                  <div className="h-5 bg-slate-700 w-full"></div>
                  <div className="h-5 bg-slate-700 w-3/5"></div>
                  <div className="w-0.5 h-16 bg-indigo-500 mt-2"></div>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-4 bg-slate-700 rounded flex-1"></div>
                    <div className="h-7 w-14 bg-indigo-600 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-4 border-teal-300/70 bg-teal-50/30"></div>
                    <div className="h-6 bg-slate-700 flex-1"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-4 border-blue-400/80 bg-teal-50/30"></div>
                    <div className="h-6 bg-slate-700 flex-1"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-white/40 bg-teal-50/30"></div>
                    <div className="h-6 bg-slate-700 flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
      {/* Features */}
      <section className="relative py-28 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_60%)]" />

        <div className="relative max-w-screen-2xl mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Engineered for speed
            </h2>
            <p className="text-gray-400 text-lg">
              Everything you need to manage complex software projects, designed with a focus on performance and minimal friction.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-10 min-h-[280px] flex flex-col justify-between transition-all duration-300 hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div>
                  <div className="w-14 h-14 mb-7 flex items-center justify-center rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition">
                    {icon}
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-3">{title}</h3>
                  <p className="text-gray-400 text-base leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-12 py-6">
        <div className="max-w-screen-xl mx-auto flex items-center gap-8">
          <p className="font-bold text-lg text-cyan-400 mr-auto">DevTrack</p>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} DevTrack. Built for high-velocity teams.</p>
          <div className="flex items-center gap-6">
            {["Documentation","Changelog"].map(item => (
              <a key={item} href="#" className="text-gray-500 hover:text-white text-sm transition">{item}</a>
            ))}
            {/* GitHub link unchanged */}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing