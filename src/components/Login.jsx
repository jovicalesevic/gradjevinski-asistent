import { useState } from 'react'
import axios from 'axios'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { API_AUTH_BASE } from '../config/api.js'

const API_BASE = API_AUTH_BASE

const fieldIconWrap =
  'pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400'

const inputWithLeftIcon =
  'w-full min-h-[48px] pl-11 pr-4 py-3 text-base rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-shadow outline-none'

const inputPasswordClasses = `${inputWithLeftIcon} pr-12`

export default function Login({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const handleForgotPassword = () => {
    alert('Kontaktirajte podršku za resetovanje lozinke.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isRegisterMode ? 'register' : 'login'
      const { data } = await axios.post(
        `${API_BASE}/${endpoint}`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } },
      )
      localStorage.setItem('isLoggedIn', 'true')
      if (data.user?.email) {
        localStorage.setItem('userEmail', data.user.email)
      }
      onClose()
      onLoginSuccess?.()
    } catch (err) {
      console.error('Full Error:', err.response || err)
      const status = err.response?.status
      if (!isRegisterMode && (status === 401 || status === 404)) {
        setError('Pogrešan email ili lozinka')
      } else {
        const msg =
          err.response?.data?.error ||
          (isRegisterMode ? 'Registracija nije uspela.' : 'Prijava nije uspela.')
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const title = isRegisterMode
    ? 'Građevinski Asistent 1.0 — Registracija'
    : 'Građevinski Asistent 1.0 — Prijava'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center pt-1">
      <div className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.07)] sm:p-8">
        <div className="mb-7 text-center">
          <h1 className="text-[1.35rem] font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Prijavite se da biste sačuvali vaš napredak i dokumentaciju.
          </p>
        </div>

        {error && (
          <div
            className="mb-6 flex gap-3 rounded-xl border border-red-200/90 bg-gradient-to-br from-red-50 to-red-50/80 px-4 py-3.5 shadow-sm"
            role="alert"
          >
            <span className="mt-0.5 shrink-0 text-red-600" aria-hidden>
              <AlertCircle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-900">
                {isRegisterMode ? 'Registracija nije uspela' : 'Prijava nije uspela'}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-red-800/95">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <span className={fieldIconWrap}>
                <Mail className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.com"
                autoComplete="email"
                className={inputWithLeftIcon}
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                Lozinka
              </label>
              {!isRegisterMode && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="shrink-0 text-sm font-medium text-emerald-800/90 underline-offset-2 hover:text-emerald-950 hover:underline"
                >
                  Zaboravili ste lozinku?
                </button>
              )}
            </div>
            <div className="relative">
              <span className={fieldIconWrap}>
                <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                className={inputPasswordClasses}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={2} aria-hidden />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-emerald-800 px-6 py-3 text-base font-semibold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-900 hover:shadow-lg hover:shadow-emerald-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {loading
              ? isRegisterMode
                ? 'Registracija u toku...'
                : 'Prijava u toku...'
              : isRegisterMode
                ? 'Registruj se'
                : 'Prijavi se'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[15px] text-slate-600">
        {isRegisterMode ? 'Već imate nalog? ' : 'Nemate nalog? '}
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(!isRegisterMode)
            setError('')
          }}
          className="font-semibold text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
        >
          {isRegisterMode ? 'Prijavite se' : 'Registrujte se'}
        </button>
      </p>
    </div>
  )
}
