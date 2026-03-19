import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const CHART_COLORS = ['#0088FE', '#00C49F', '#D35400', '#8884d8']

const API_BASE = 'http://localhost:5000/api/user'

// Format date for PDF with Europe/Belgrade timezone (local time)
const formatPdfDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('sr-RS', {
    timeZone: 'Europe/Belgrade',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

let robotoBase64Cache = null

const toPdfSafe = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

const loadRobotoFont = async (doc) => {
  try {
    if (!robotoBase64Cache) {
      const res = await fetch('/Roboto-Regular.ttf')
      if (!res.ok) throw new Error('Font fetch failed')
      const blob = await res.blob()
      robotoBase64Cache = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result
          resolve(typeof result === 'string' ? result.split(',')[1] || '' : '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
    doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64Cache)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    return true
  } catch (err) {
    console.warn('Roboto font load failed, falling back to Helvetica:', err)
    return false
  }
}

const generatePDF = async (calculation, userEmail, chartImageBase64 = null) => {
  try {
    console.log('Generating PDF for...', calculation?.title)

    if (!calculation) {
      console.error('PDF Error: calculation is undefined')
      alert('Greška: Proračun nije pronađen.')
      return
    }

    const doc = new jsPDF()
    const items = Array.isArray(calculation.items) ? calculation.items : []
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    const useRoboto = await loadRobotoFont(doc)
    const fontName = useRoboto ? 'Roboto' : 'helvetica'
    const text = (str) => useRoboto ? str : toPdfSafe(str)

    const projectName = calculation.title || 'Proračun'
    const currentDateTime = new Date().toLocaleString('sr-RS', {
      timeZone: 'Europe/Belgrade',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    doc.setFontSize(16)
    doc.setFont(fontName, useRoboto ? 'normal' : 'bold')
    doc.text(text('PROJEKAT: ' + projectName), margin, 16)
    doc.setFont(fontName, 'normal')
    doc.setFontSize(10)
    doc.text(text('Investitor: ' + (userEmail || '')), margin, 24)
    doc.text(text('Datum: ' + currentDateTime), margin, 31)

    const tableData = items.map((item) => {
      const label = item.vrsta ?? item.name ?? item.label ?? ''
      const amount = item.iznos ?? item.amount ?? item.cost ?? 0
      return [text(String(label)), Number(amount).toLocaleString('sr-RS')]
    })
    tableData.push([text('Ukupan iznos'), Number(calculation.totalAmount || 0).toLocaleString('sr-RS')])

    autoTable(doc, {
      startY: 38,
      head: [[text('Stavka'), text('Iznos (RSD)')]],
      body: tableData,
      theme: 'grid',
      styles: { font: fontName, fontStyle: 'normal' },
      headStyles: { fillColor: [71, 85, 105], font: fontName, fontStyle: 'normal' },
      bodyStyles: { font: fontName, fontStyle: 'normal' },
      columnStyles: {
        0: { cellWidth: 140, overflow: 'linebreak', font: fontName },
        1: { cellWidth: 55, halign: 'right', font: fontName },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [226, 232, 240]
          data.cell.styles.font = fontName
          data.cell.styles.fontStyle = 'normal'
        }
      },
    })

    let currentY = doc.lastAutoTable?.finalY ?? 38

    if (chartImageBase64 && items.length > 0) {
      const chartWidthMm = 140
      const chartHeightMm = 70
      const chartX = (pageWidth - chartWidthMm) / 2
      currentY += 10
      doc.addImage(chartImageBase64, 'PNG', chartX, currentY, chartWidthMm, chartHeightMm)
      currentY += chartHeightMm + 10
    }

    const footerY = Math.min(currentY + 8, 280)
    doc.setFont(fontName, 'normal')
    doc.setFontSize(8)
    doc.text(text('Proračun je informativnog karaktera.'), margin, footerY)

    const safeTitle = (calculation.title || 'Proračun').replace(/[/\\:*?"<>|]/g, '-').slice(0, 50)
    doc.save(`Proracun-${safeTitle.slice(0, 30)}.pdf`)
  } catch (error) {
    console.error('PDF Error:', error)
    alert('Greška pri generisanju PDF-a: ' + (error?.message || 'Nepoznata greška'))
  }
}

export default function SavedCalculations({ isLoggedIn, refreshTrigger = 0 }) {
  const [calculations, setCalculations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [pdfChartFor, setPdfChartFor] = useState(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [chartVisibleForCapture, setChartVisibleForCapture] = useState(false)
  const chartRef = useRef(null)
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

  const handleDownloadPDF = async (calc) => {
    const items = Array.isArray(calc.items) ? calc.items : []
    if (items.length === 0) {
      await generatePDF(calc, userEmail)
      return
    }
    setPdfGenerating(true)
    setPdfChartFor(calc)
    await new Promise((r) => setTimeout(r, 500))
    setChartVisibleForCapture(true)
    await new Promise((r) => setTimeout(r, 100))
    let chartImageBase64 = null
    try {
      const chartEl = document.getElementById('pdf-chart-container')
      if (chartEl) {
        const canvas = await html2canvas(chartEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        })
        chartImageBase64 = canvas.toDataURL('image/png')
      } else {
        console.error('PDF chart: element #pdf-chart-container not found')
      }
    } catch (err) {
      console.error('PDF chart: html2canvas failed', err)
    } finally {
      setChartVisibleForCapture(false)
      setPdfChartFor(null)
    }
    await generatePDF(calc, userEmail, chartImageBase64)
    setPdfGenerating(false)
  }

  if (!isLoggedIn) return null

  if (loading) {
    return (
      <section className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Moja arhiva proračuna
        </h2>
        <p className="text-center text-slate-500">Učitavanje...</p>
      </section>
    )
  }

  return (
    <section className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
        Moja arhiva proračuna
      </h2>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {calculations.length === 0 && !error && (
        <p className="text-center text-slate-500 py-8">
          Nemate sačuvanih proračuna u arhivi. Sačuvajte proračun iz kalkulatora.
        </p>
      )}

      {pdfChartFor && (
        <div
          id="pdf-chart-container"
          ref={chartRef}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-white p-4 border border-slate-200 pointer-events-none ${chartVisibleForCapture ? 'opacity-100 z-[9999]' : 'opacity-0 z-[-1]'}`}
          aria-hidden="true"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={(Array.isArray(pdfChartFor.items) ? pdfChartFor.items : []).map((item) => ({
                  name: item.vrsta ?? item.name ?? item.label ?? '',
                  value: item.iznos ?? item.amount ?? item.cost ?? 0,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
              >
                {(Array.isArray(pdfChartFor.items) ? pdfChartFor.items : []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {calculations.length > 0 && (
        <div className="space-y-4">
          {calculations.map((calc) => {
            const isExpanded = expandedId === calc._id
            const items = Array.isArray(calc.items) ? calc.items : []

            return (
              <div
                key={calc._id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('button')) return
                    setExpandedId(isExpanded ? null : calc._id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (e.target.closest('button')) return
                      setExpandedId(isExpanded ? null : calc._id)
                    }
                  }}
                  className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
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
                      {items.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {items.length} stavki • Kliknite za detalje
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadPDF(calc)
                        }}
                        disabled={pdfGenerating}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {pdfGenerating ? 'Priprema...' : 'Preuzmi PDF'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(calc._id)
                        }}
                        disabled={deletingId === calc._id}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === calc._id ? 'Brisanje...' : 'Obriši'}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Detaljan pregled
                      </h3>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Zatvori
                      </button>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">
                              Stavka
                            </th>
                            <th className="px-4 py-2.5 text-right font-semibold text-slate-700">
                              Iznos (RSD)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => {
                            const label = item.vrsta ?? item.name ?? item.label ?? `Stavka ${idx + 1}`
                            const amount = item.iznos ?? item.amount ?? item.cost ?? 0
                            return (
                              <tr
                                key={idx}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                              >
                                <td className="px-4 py-2.5 text-slate-700">{label}</td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-800 tabular-nums">
                                  {Number(amount).toLocaleString('sr-RS')}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 border-t-2 border-slate-200">
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              Ukupno
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                              {formatAmount(calc.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
