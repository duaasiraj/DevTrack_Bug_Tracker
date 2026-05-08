import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-slate-900/95 backdrop-blur-md">
      <nav
        className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 px-4 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        <div className="flex shrink-0 items-center">
          <Link
            to="/"
            className="font-bold text-lg tracking-tight text-cyan-400 transition-colors hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md"
          >
            DevTrack
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <ul className="flex items-center gap-8 text-sm">
            <li>
              <Link
                to="/features"
                className="text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-md px-1 py-0.5"
              >
                Features
              </Link>
            </li>
            <li>
              <Link
                to="/roles"
                className="text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-md px-1 py-0.5"
              >
                Roles
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-md px-1 py-0.5"
              >
                About us
              </Link>
            </li>
          </ul>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/signin"
            className="hidden text-sm text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-3 py-2 sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 sm:px-4"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Mobile nav row — even spacing, no overlap with logo */}
      <div className="border-t border-white/[0.05] bg-slate-900/90 px-4 py-2 md:hidden">
        <ul className="flex items-center justify-around gap-2 text-xs">
          <li>
            <Link to="/features" className="block py-1.5 text-gray-400 hover:text-white text-center">
              Features
            </Link>
          </li>
          <li>
            <Link to="/roles" className="block py-1.5 text-gray-400 hover:text-white text-center">
              Roles
            </Link>
          </li>
          <li>
            <Link to="/about" className="block py-1.5 text-gray-400 hover:text-white text-center">
              About
            </Link>
          </li>
          <li>
            <Link to="/signin" className="block py-1.5 text-indigo-300 hover:text-white text-center font-medium">
              Sign in
            </Link>
          </li>
        </ul>
      </div>
    </header>
  )
}

export default Navbar
