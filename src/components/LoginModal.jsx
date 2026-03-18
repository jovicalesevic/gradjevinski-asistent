import { useState } from 'react'
import axios from 'axios'
import Modal from './Modal'

const inputClasses =
  'w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none'

const API_BASE = 'http://localhost:5000/api/auth'

export default function LoginModal({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isRegisterMode ? 'register' : 'login'
      const { data } = await axios.post(`${API_BASE}/${endpoint}`, { email, password }, {
        headers: { 'Content-Type': 'application/json' },
      })
      localStorage.setItem('isLoggedIn', 'true')
      if (data.user?.email) {
        localStorage.setItem('userEmail', data.user.email)
      }
      onClose()
      alert(isRegisterMode ? 'Uspešno ste se registrovali!' : 'Uspešno ste se prijavili!')
      onLoginSuccess?.()
    } catch (err) {
      console.error('Full Error:', err.response || err)
      const msg = err.response?.data?.error || (isRegisterMode ? 'Registracija nije uspela.' : 'Prijava nije uspela.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Dobrodošli u GrađevinskiAsistent
      </h2>
      <p className="text-slate-600 mb-6">
        Prijavite se da biste sačuvali vaš napredak i dokumentaciju.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.com"
            className={inputClasses}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Lozinka
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClasses}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3.5 text-base font-semibold rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Učitavanje...' : isRegisterMode ? 'Registruj se' : 'Prijavi se'}
        </button>
      </form>

      <p className="mt-5 text-center text-slate-600 text-sm">
        {isRegisterMode ? 'Već imaš nalog? ' : 'Nemaš nalog? '}
        <button
          type="button"
          onClick={() => { setIsRegisterMode(!isRegisterMode); setError('') }}
          className="text-blue-600 font-medium hover:text-blue-700 hover:underline underline-offset-2"
        >
          {isRegisterMode ? 'Prijavi se' : 'Registruj se'}
        </button>
      </p>
    </Modal>
  )
}
