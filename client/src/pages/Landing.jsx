import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { Shield, GitBranch, Layout, Filter, Bell, MessageSquare, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: <Shield className="w-5 h-5 text-indigo-400" />,
    title: "Role-Based Access",
    desc: "Granular permissions ensure right people have right access level across all projects.",
  },
  {
    icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
    title: "Issue Lifecycle",
    desc: "Customize workflows to match how your team actually builds and ships software.",
  },
  {
    icon: <Layout className="w-5 h-5 text-indigo-400" />,
    title: "Project Management",
    desc: "Organize issues into cycles, projects, and custom views tailored to your process.",
  },
  {
    icon: <Filter className="w-5 h-5 text-indigo-400" />,
    title: "Smart Filtering",
    desc: "Find anything instantly with powerful, combinable filters and saved views.",
  },
  {
    icon: <Bell className="w-5 h-5 text-indigo-400" />,
    title: "In-App Notifications",
    desc: "Stay focused with an intelligent inbox that only alerts you to what matters.",
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-indigo-400" />,
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
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 py-12 sm:py-14 px-4 sm:pl-6 sm:pr-4 max-w-screen-xl mx-auto">
          {/* Left */}
          <div className="flex-1 flex flex-col w-full max-w-xl">
            <div className="inline-flex items-center gap-2 bg-teal-900/50 text-teal-400 text-xs px-3 py-1 rounded-full mb-6 w-fit">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span>DevTrack is now live</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-4">
              Track every bug.<br />
              Ship with<br />
              <span className="font-bold text-teal-400">
                confidence.
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md leading-relaxed">
              A simple issue tracker built for fast paced software development teams. Streamline your workflow, manage complex projects and deploy faster. QA testers, project managers, developers, all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl transition-colors text-base sm:text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70"
              >
                Start building
                <ArrowRight className="w-5 h-5" aria-hidden />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center border border-teal-400/35 bg-teal-500/10 hover:bg-teal-500/15 backdrop-blur-sm text-teal-200 hover:text-white px-8 py-3.5 rounded-xl transition-colors text-base sm:text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
              >
                About us
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 w-full hidden md:block max-w-lg lg:max-w-none">
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 min-h-[320px] lg:min-h-[560px] shadow-xl shadow-black/20">
              <div className="flex gap-1.5 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
              </div>
              <div className="h-3.5 bg-slate-700 rounded w-2/3 mb-4"></div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-3 w-2/5">
                  <div className="h-4 bg-slate-700 w-full"></div>
                  <div className="h-4 bg-slate-700 w-4/5"></div>
                  <div className="h-4 bg-slate-700 w-full"></div>
                  <div className="h-4 bg-slate-700 w-3/5"></div>
                  <div className="w-0.5 h-14 bg-indigo-500 mt-2"></div>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-3.5 bg-slate-700 rounded flex-1"></div>
                    <div className="h-7 w-12 bg-indigo-600 rounded"></div>
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
      <section id="features" className="relative py-16 px-6 scroll-mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_60%)]" />

        <div className="relative max-w-screen-xl mx-auto">
          <div className="text-center mb-10 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-3">
              Engineered for speed
            </h2>
            <p className="text-gray-400 text-sm">
              Everything you need to manage complex software projects, designed with a focus on performance and minimal friction.
            </p>
            <Link
              to="/features"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 rounded-lg px-2 py-1"
            >
              Explore all features
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-7 min-h-[200px] flex flex-col justify-between transition-all duration-300 hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div>
                  <div className="w-10 h-10 mb-5 flex items-center justify-center rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition">
                    {icon}
                  </div>
                  <h3 className="text-white text-base font-semibold mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 sm:px-10 py-6">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
          <p className="font-bold text-sm text-cyan-400 sm:mr-auto">DevTrack</p>
          <p className="text-gray-500 text-xs order-last sm:order-none w-full sm:w-auto text-center sm:text-left">
            © {new Date().getFullYear()} DevTrack. Built for high-velocity teams.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/features" className="text-gray-500 hover:text-white text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded">
              Features
            </Link>
            <Link to="/roles" className="text-gray-500 hover:text-white text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded">
              Roles
            </Link>
            <Link to="/about" className="text-gray-500 hover:text-white text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded">
              About us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing