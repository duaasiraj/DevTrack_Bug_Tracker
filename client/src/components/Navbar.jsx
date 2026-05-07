import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] text-sm">
      <div className="mr-auto">
        <Link
          to="/"
          className="font-bold text-cyan-400 text-lg tracking-tight hover:text-cyan-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded"
        >
          DevTrack
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          to="/features"
          className="text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded px-0.5"
        >
          Features
        </Link>
        <Link
          to="/roles"
          className="text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded px-0.5"
        >
          Roles
        </Link>
        <Link
          to="/about"
          className="text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded px-0.5"
        >
          About us
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Link
          to="/signin"
          className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2 rounded-lg text-white font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60"
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
