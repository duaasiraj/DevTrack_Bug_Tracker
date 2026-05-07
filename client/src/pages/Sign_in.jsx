import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { KeyRound } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [accessHint, setAccessHint] = useState(null)

  const [showReset, setShowReset] = useState(false)
  const [resetUserId, setResetUserId] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPassword2, setResetPassword2] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const st = location.state?.registerNotice
    if (st?.adminEmail && st?.adminId) {
      setAccessHint(st)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/auth/login', { email, password })
      login(response.data.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')
    if (resetPassword !== resetPassword2) {
      setResetError('Passwords do not match.')
      return
    }
    setResetting(true)
    try {
      await api.post('/auth/reset-password', {
        user_id: resetUserId.trim(),
        newPassword: resetPassword,
      })
      setResetSuccess('Password updated. You can sign in with your email and the new password.')
      setResetUserId('')
      setResetPassword('')
      setResetPassword2('')
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Could not update password')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1f1f] flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-white text-3xl font-bold tracking-tight">⊙ DevTrack</h1>
        <h2 className="text-white text-xl font-semibold mt-2">Sign In</h2>
      </div>

      <div className="bg-[#0d2b2b] border border-[#1a3f3f] rounded-2xl p-8 w-full max-w-md space-y-8">
        {accessHint && (
          <div className="rounded-lg border border-[#78e5ef]/25 bg-[#78e5ef]/5 px-4 py-3 text-sm text-[#b8f0f4]">
            <p className="font-medium text-white">When your account is ready</p>
            <p className="mt-1 text-[#7aa8a8] text-xs leading-relaxed">
              You noted your administrator as <span className="text-[#c8faf4]">{accessHint.adminEmail}</span> (ID{' '}
              <span className="font-mono text-[#c8faf4]">{accessHint.adminId}</span>). Sign in below once they have
              created your user.
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-[#7aa8a8] text-xs font-semibold uppercase tracking-widest">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-[#0a1f1f] border border-[#1a3f3f] text-white placeholder-[#3a6060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2a7a7a] focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[#7aa8a8] text-xs font-semibold uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#0a1f1f] border border-[#1a3f3f] text-white placeholder-[#3a6060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2a7a7a] focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
            />
          </div>
          <button
            type="submit"
            className="mt-2 bg-[#c8faf4] text-[#0a1f1f] font-semibold py-3 rounded-lg text-sm hover:bg-[#a0f0e8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8faf4]/50"
          >
            Sign In
          </button>
        </form>

        <div className="border-t border-[#1a3f3f] pt-6">
          <button
            type="button"
            onClick={() => {
              setShowReset((v) => !v)
              setResetError('')
              setResetSuccess('')
            }}
            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[#78e5ef] hover:text-[#9eedf3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded-lg py-1"
          >
            <KeyRound size={16} aria-hidden />
            {showReset ? 'Hide change password' : 'Change password (user ID)'}
          </button>

          {showReset && (
            <form onSubmit={handleResetPassword} className="mt-5 space-y-4 text-left">
              <p className="text-xs text-[#7aa8a8] leading-relaxed">
                Enter your <span className="text-[#c8faf4] font-mono">user_id</span> UUID exactly as stored in the
                database (your admin can copy it from the user list), then set a new password.
              </p>
              {resetError && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{resetError}</p>
              )}
              {resetSuccess && (
                <p className="text-emerald-300 text-xs bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2">
                  {resetSuccess}
                </p>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[#7aa8a8] text-xs font-semibold uppercase tracking-widest">User ID (UUID)</label>
                <input
                  value={resetUserId}
                  onChange={(e) => setResetUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="bg-[#0a1f1f] border border-[#1a3f3f] text-white placeholder-[#3a6060] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#2a7a7a] focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[#7aa8a8] text-xs font-semibold uppercase tracking-widest">New password</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="bg-[#0a1f1f] border border-[#1a3f3f] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2a7a7a] focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[#7aa8a8] text-xs font-semibold uppercase tracking-widest">Confirm password</label>
                <input
                  type="password"
                  value={resetPassword2}
                  onChange={(e) => setResetPassword2(e.target.value)}
                  className="bg-[#0a1f1f] border border-[#1a3f3f] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2a7a7a] focus-visible:ring-2 focus-visible:ring-[#78e5ef]/25"
                />
              </div>
              <button
                type="submit"
                disabled={resetting}
                className="w-full py-2.5 rounded-lg border border-[#78e5ef]/40 text-[#78e5ef] text-sm font-semibold hover:bg-[#78e5ef]/10 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40"
              >
                {resetting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[#7aa8a8] text-sm pt-2 border-t border-[#1a3f3f]">
          Need an account?{' '}
          <Link
            to="/register"
            className="text-[#c8faf4] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8faf4]/40 rounded"
          >
            Contact your admin
          </Link>
        </p>
      </div>

      <p className="text-[#3a6060] text-xs mt-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#2a7a7a] inline-block" />
        Organization sign-in
      </p>
    </div>
  )
}
