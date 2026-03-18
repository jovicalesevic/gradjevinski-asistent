import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:5000/api/user'

export default function SavedCalculations({ isLoggedIn, refreshTrigger = 0 }) {
  const [calculations, setCalculations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const fetchingRef = useRef(false)

  const userEmail = localStorage.getItem('userEmail')

  useEffect(() => {
    if (!isLoggedIn || !userEmail) {
      setLoading(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true

    const controller = new AbortController()

    const fetchCalculations = async () => {
      setError('')
      try {
        const url = `${API_BASE}/calculations/${encodeURIComponent(userEmail)}`
        console.log('Requesting data for:', userEmail)
        const { data } = await axios.get(url, { signal: controller.signal })
        const list = Array.isArray(data?.savedCalculations) ? data.savedCalculations : []
        setCalculations(list)
      } catch (err) {
        if (axios.isCancel(err)) return
        console.error('FETCH ERROR:', err.response?.data || err.message)
        const status = err.response?.status
        const msg = err.response?.data?.error
        if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('Mrežna greška – proverite da li je server pokrenut.')
        } else if (status === 404) {
          setError(msg || 'Korisnik nije pronađen.')
        } else {
          setError(msg || 'Greška pri učitavanju proračuna.')
        }
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }

    fetchCalculations()
    return () => {
      controller.abort()
      fetchingRef.current = false
    }
  }, [isLoggedIn, userEmail, refreshTrigger])

  const handleDelete = async (calculationId) => {
    if (!userEmail) return
    setDeletingId(calculationId)
    try {
      const { data } = await axios.delete(
        `${API_BASE}/calculations/${encodeURIComponent(userEmail)}/${calculationId}`
      )
      setCalculations(data.savedCalculations || [])
    } catch (err) {
      alert(err.response?.data?.error || 'Greška pri brisanju.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAmount = (amount) => {
    return Number(amount).toLocaleString('sr-RS') + ' RSD'
  }

  if (!isLoggedIn) return null

  if (loading) {
    return (
      <section className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Sačuvani proračuni
        </h2>
        <p className="text-center text-slate-500">Učitavanje...</p>
      </section>
    )
  }

  return (
    <section className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
        Sačuvani proračuni
      </h2>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {calculations.length === 0 && !error && (
        <p className="text-center text-slate-500 py-8">
          Nemate sačuvanih proračuna. Sačuvajte proračun iz kalkulatora.
        </p>
      )}

      {calculations.length > 0 && (
        <div className="space-y-4">
          {calculations.map((calc) => (
            <div
              key={calc._id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {calc.title}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatDate(calc.createdAt)}
                  </p>
                  <p className="text-lg font-bold text-slate-800 mt-2 tabular-nums">
                    {formatAmount(calc.totalAmount)}
                  </p>
                  {calc.items && calc.items.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {calc.items.length} stavki
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(calc._id)}
                  disabled={deletingId === calc._id}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === calc._id ? 'Brisanje...' : 'Obriši'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
