import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function Register() {
  return (
    <div className="min-h-screen bg-[#0a1f1f] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden
      >
        <div className="w-full max-w-lg scale-110 blur-sm opacity-35">
          <div className="rounded-2xl border border-[#1a3f3f] bg-[#0d2b2b]/80 p-8 space-y-4">
            <div className="h-4 w-1/3 rounded bg-[#1a3f3f]" />
            <div className="h-10 rounded-lg bg-[#0a1f1f] border border-[#1a3f3f]" />
            <div className="h-10 rounded-lg bg-[#0a1f1f] border border-[#1a3f3f]" />
            <div className="h-10 rounded-lg bg-[#0a1f1f] border border-[#1a3f3f]" />
            <div className="h-11 rounded-lg bg-[#c8faf4]/20" />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#78e5ef]/40 bg-[#042124]/90 shadow-lg shadow-[#78e5ef]/10 backdrop-blur-sm">
          <Lock className="h-10 w-10 text-[#78e5ef]" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="mt-8 text-white text-3xl font-bold tracking-tight">⊙ DevTrack</h1>
        <h2 className="mt-3 text-xl font-semibold text-[#c8faf4]">Registration is closed</h2>
        <p className="mt-4 text-[#7aa8a8] text-sm leading-relaxed px-2">
          New accounts are created only by your organization&apos;s administrator. Please contact your admin for
          credentials, then sign in below.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signin"
            className="inline-flex items-center justify-center rounded-xl bg-[#c8faf4] text-[#0a1f1f] font-semibold px-8 py-3 text-sm hover:bg-[#a0f0e8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8faf4]/50"
          >
            Sign in
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#1a3f3f] text-[#7aa8a8] font-medium px-8 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
