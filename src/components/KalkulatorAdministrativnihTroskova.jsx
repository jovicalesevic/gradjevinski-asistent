import { useState, useMemo, useCallback } from 'react'
import axios from 'axios'
import { ChevronDown } from 'lucide-react'
import { API_USER_BASE } from '../config/api.js'
import {
  MATERIAL_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORY_ID,
  normalizeCategoryId,
} from '../data/materialCategories.js'
import {
  ADMIN_COST_CATEGORIES,
  ADMIN_TEMPLATE_ITEM_DEFS,
  DEFAULT_ADMIN_CATEGORY_ID,
  RSD_PER_EUR,
  computeTemplateItemRsd,
  normalizeAdminCategoryId,
} from '../data/adminCostCategories.js'
import Modal from './Modal'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const inputClasses =
  'w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none'

/** Isti stil za administrativne i materijalne sekcije (accordion + kartice) */
const accordionDetailsClass =
  'group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'
const accordionSummaryClass =
  'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 min-h-[52px] hover:bg-slate-50/90 transition-colors [&::-webkit-details-marker]:hidden'
const accordionBodyClass =
  'border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 space-y-3 bg-slate-50/40'
const itemCardClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
const statusSelectClass =
  'w-full min-h-[48px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none'
const primaryActionBtnClass =
  'w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-slate-800 text-white text-sm font-semibold shadow-md hover:bg-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2'

const CHART_COLORS = ['#0088FE', '#00C49F', '#D35400', '#8884d8']

function formatMoney(amountRsd, currency) {
  if (currency === 'EUR') {
    const v = amountRsd / RSD_PER_EUR
    return `${v.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} EUR`
  }
  return `${amountRsd.toLocaleString('sr-RS')} RSD`
}

export default function KalkulatorAdministrativnihTroskova({
  isLoggedIn,
  objectType,
  workType,
  municipality,
  onCalculationSaved,
}) {
  const [kvadratura, setKvadratura] = useState('')
  const [cenaArhitekte, setCenaArhitekte] = useState(15)
  const [currency, setCurrency] = useState('RSD')

  const [adminItemStatus, setAdminItemStatus] = useState({})
  const [customAdminItems, setCustomAdminItems] = useState([])
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false)
  const [adminDraft, setAdminDraft] = useState({
    categoryId: DEFAULT_ADMIN_CATEGORY_ID,
    name: '',
    amount: '',
    status: 'U planu',
  })

  const m2 = parseFloat(kvadratura) || 0

  const adminLinesFlat = useMemo(() => {
    const ctx = { m2, cenaArhitekteEur: cenaArhitekte }
    const templateLines = ADMIN_TEMPLATE_ITEM_DEFS.map((def) => ({
      id: def.id,
      categoryId: def.categoryId,
      label: def.label,
      amountRsd: computeTemplateItemRsd(def, ctx),
      source: 'template',
    }))
    const customLines = customAdminItems.map((c) => ({
      id: c.id,
      categoryId: normalizeAdminCategoryId(c.categoryId),
      label: c.name,
      amountRsd: Number(c.amountRsd) || 0,
      source: 'custom',
      status: c.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    }))
    return [...templateLines, ...customLines]
  }, [m2, cenaArhitekte, customAdminItems])

  const getLineStatus = useCallback(
    (line) => {
      if (line.source === 'custom') return line.status
      return adminItemStatus[line.id] === 'Plaćeno' ? 'Plaćeno' : 'U planu'
    },
    [adminItemStatus]
  )

  const adminFinance = useMemo(() => {
    let total = 0
    let placeno = 0
    for (const line of adminLinesFlat) {
      const amt = line.amountRsd
      total += amt
      if (getLineStatus(line) === 'Plaćeno') placeno += amt
    }
    return { total, placeno, preostalo: Math.max(0, total - placeno) }
  }, [adminLinesFlat, getLineStatus])

  const adminByCategory = useMemo(() => {
    const buckets = Object.fromEntries(ADMIN_COST_CATEGORIES.map((c) => [c.id, []]))
    for (const line of adminLinesFlat) {
      const cid = line.categoryId
      if (!buckets[cid]) buckets[cid] = []
      buckets[cid].push({ ...line, status: getLineStatus(line) })
    }
    return ADMIN_COST_CATEGORIES.map((cat) => ({
      ...cat,
      lines: buckets[cat.id] || [],
      groupTotal: (buckets[cat.id] || []).reduce((s, l) => s + l.amountRsd, 0),
    }))
  }, [adminLinesFlat, getLineStatus])

  const troskovi = useMemo(
    () => adminLinesFlat.map((line) => ({ vrsta: line.label, iznos: line.amountRsd })),
    [adminLinesFlat]
  )

  const ukupno = adminFinance.total

  const [materialDraft, setMaterialDraft] = useState({
    categoryId: DEFAULT_MATERIAL_CATEGORY_ID,
    name: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    status: 'U planu',
  })
  const [materials, setMaterials] = useState([])
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false)

  const materialsTotal = useMemo(
    () => materials.reduce((sum, m) => sum + (Number(m.total) || 0), 0),
    [materials]
  )

  const materialsFinance = useMemo(() => {
    const ukupnoProjektovano = materials.reduce((s, m) => s + (Number(m.total) || 0), 0)
    const realizovano = materials.reduce(
      (sum, m) => sum + (m.status === 'Plaćeno' ? Number(m.total) || 0 : 0),
      0
    )
    const preostalo = Math.max(0, ukupnoProjektovano - realizovano)
    return { ukupnoProjektovano, realizovano, preostalo }
  }, [materials])

  const materialsByCategory = useMemo(() => {
    const buckets = Object.fromEntries(MATERIAL_CATEGORIES.map((c) => [c.id, []]))
    for (const m of materials) {
      const cid = normalizeCategoryId(m.categoryId)
      if (!buckets[cid]) buckets[cid] = []
      buckets[cid].push(m)
    }
    return MATERIAL_CATEGORIES.map((cat) => ({
      ...cat,
      items: buckets[cat.id] || [],
      groupTotal: (buckets[cat.id] || []).reduce((s, m) => s + (Number(m.total) || 0), 0),
    }))
  }, [materials])

  const ukupnoProjekat = ukupno + materialsTotal

  const chartData = troskovi.map((item) => ({
    name: item.vrsta,
    value: item.iznos,
  }))

  const [saving, setSaving] = useState(false)

  const handleTemplateStatusChange = (lineId, status) => {
    setAdminItemStatus((prev) => ({
      ...prev,
      [lineId]: status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    }))
  }

  const handleCustomAdminStatusChange = (id, status) => {
    setCustomAdminItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: status === 'Plaćeno' ? 'Plaćeno' : 'U planu' } : c
      )
    )
  }

  const handleRemoveCustomAdmin = (id) => {
    setCustomAdminItems((prev) => prev.filter((c) => c.id !== id))
  }

  const handleAddCustomAdmin = () => {
    const name = adminDraft.name.trim()
    if (!name) {
      alert('Unesite naziv troška.')
      return
    }
    const amountRsd = Math.max(0, Number(adminDraft.amount) || 0)
    const categoryId = normalizeAdminCategoryId(adminDraft.categoryId)
    const status = adminDraft.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'
    setCustomAdminItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `a-${Date.now()}-${prev.length}`,
        categoryId,
        name,
        amountRsd,
        status,
      },
    ])
    setAdminDraft({
      categoryId: DEFAULT_ADMIN_CATEGORY_ID,
      name: '',
      amount: '',
      status: 'U planu',
    })
    setAddAdminModalOpen(false)
  }

  const handleAddMaterial = () => {
    const name = materialDraft.name.trim()
    if (!name) {
      alert('Unesite naziv materijala.')
      return
    }
    const quantity = Math.max(0, Number(materialDraft.quantity) || 0)
    const unitPrice = Math.max(0, Number(materialDraft.unitPrice) || 0)
    const total = quantity * unitPrice
    const categoryId = normalizeCategoryId(materialDraft.categoryId)
    const status = materialDraft.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'
    setMaterials((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `m-${Date.now()}-${prev.length}`,
        categoryId,
        name,
        unit: materialDraft.unit.trim(),
        quantity,
        unitPrice,
        total,
        status,
      },
    ])
    setMaterialDraft({
      categoryId: DEFAULT_MATERIAL_CATEGORY_ID,
      name: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      status: 'U planu',
    })
    setAddMaterialModalOpen(false)
  }

  const handleRemoveMaterial = (id) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const handleMaterialStatusChange = (id, status) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
  }

  const handleSacuvajProracun = async () => {
    const email = localStorage.getItem('userEmail')
    if (!email) return

    setSaving(true)
    try {
      const title =
        [objectType || 'Objekt', workType || 'Radovi', municipality || 'Opština']
          .filter(Boolean)
          .join(' - ') || 'Administrativni troškovi'

      const materialsPayload = materials.map(
        ({ name, unit, quantity, unitPrice, total, categoryId, status }) => ({
          name,
          unit,
          quantity,
          unitPrice,
          total,
          category: categoryId || 'ostalo',
          status: status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
        })
      )

      await axios.post(`${API_USER_BASE}/save-calculation`, {
        email,
        title,
        totalAmount: ukupnoProjekat,
        items: troskovi,
        materials: materialsPayload,
        location: municipality || '',
      })
      alert('Proračun je uspešno sačuvan na Vašem profilu!')
      onCalculationSaved?.()
    } catch (err) {
      alert(err.response?.data?.error || 'Greška pri čuvanju proračuna.')
    } finally {
      setSaving(false)
    }
  }

  const currencyBtn = (code) =>
    `min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-colors ${
      currency === code
        ? 'bg-slate-800 text-white shadow-sm'
        : 'text-slate-600 hover:bg-white hover:text-slate-900'
    }`

  return (
    <section className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
        Kalkulator administrativnih troškova
      </h2>

      {/* Sticky summary + currency */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 mb-8 rounded-b-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-md backdrop-blur-md sm:rounded-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="text-sm font-medium text-slate-600">Valuta</span>
            <div
              className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
              role="group"
              aria-label="Izbor valute"
            >
              <button type="button" className={currencyBtn('RSD')} onClick={() => setCurrency('RSD')}>
                RSD
              </button>
              <button type="button" className={currencyBtn('EUR')} onClick={() => setCurrency('EUR')}>
                EUR
              </button>
            </div>
            <span className="text-xs text-slate-400">Kurs: 1 EUR = {RSD_PER_EUR} RSD</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Ukupno administrativno
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                {formatMoney(adminFinance.total, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Plaćeno
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900 sm:text-xl">
                {formatMoney(adminFinance.placeno, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-red-50/40 px-4 py-3 text-center sm:text-left ring-1 ring-amber-200/80">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                Preostalo
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-900 sm:text-xl">
                {formatMoney(adminFinance.preostalo, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div>
          <label
            htmlFor="kvadratura"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Planirana kvadratura objekta (m²)
          </label>
          <input
            id="kvadratura"
            type="number"
            min="0"
            step="0.01"
            value={kvadratura}
            onChange={(e) => setKvadratura(e.target.value)}
            placeholder="npr. 120"
            className={inputClasses}
          />
        </div>

        <div>
          <label
            htmlFor="cena-arhitekte"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Cena projekta arhitekte po m² (u EUR)
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center">
            <input
              id="cena-arhitekte"
              type="range"
              min="5"
              max="50"
              step="1"
              value={cenaArhitekte}
              onChange={(e) => setCenaArhitekte(Number(e.target.value))}
              className="w-full min-h-[44px] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="5"
                max="100"
                value={cenaArhitekte}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCenaArhitekte(Math.min(100, Math.max(5, val || 5)))
                }}
                className="w-24 min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-center text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
              <span className="text-slate-600 text-sm font-medium">EUR</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">
        Administrativni troškovi
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6 max-w-xl mx-auto">
        Takse, projekti i doprinosi po grupama. Unosi su u RSD; prikaz u EUR koristi kurs{' '}
        {RSD_PER_EUR} RSD za 1 EUR.
      </p>

      <div className="flex justify-center sm:justify-end mb-6">
        <button
          type="button"
          onClick={() => setAddAdminModalOpen(true)}
          className={primaryActionBtnClass}
        >
          + Dodaj trošak
        </button>
      </div>

      {addAdminModalOpen && (
        <Modal onClose={() => setAddAdminModalOpen(false)} panelClassName="max-w-lg">
          <div className="pr-8">
            <h4 className="text-lg font-bold text-slate-900 mb-1">Novi administrativni trošak</h4>
            <p className="text-sm text-slate-500 mb-5">Iznos unesite u RSD.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategorija</label>
                <select
                  value={adminDraft.categoryId}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, categoryId: e.target.value }))
                  }
                  className={inputClasses}
                >
                  {ADMIN_COST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Naziv troška</label>
                <input
                  type="text"
                  value={adminDraft.name}
                  onChange={(e) => setAdminDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="npr. Geodetski elaborat"
                  className={inputClasses}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Iznos (RSD)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={adminDraft.amount}
                  onChange={(e) => setAdminDraft((d) => ({ ...d, amount: e.target.value }))}
                  placeholder="0"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  value={adminDraft.status}
                  onChange={(e) =>
                    setAdminDraft((d) => ({
                      ...d,
                      status: e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu',
                    }))
                  }
                  className={inputClasses}
                >
                  <option value="U planu">U planu</option>
                  <option value="Plaćeno">Plaćeno</option>
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddAdminModalOpen(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomAdmin}
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <div className="space-y-3 mb-8">
        {adminByCategory.map(({ id, label, lines, groupTotal }) => (
          <details key={id} className={accordionDetailsClass}>
            <summary className={accordionSummaryClass}>
              <span className="flex items-center gap-2 min-w-0 font-semibold text-slate-800">
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                {formatMoney(groupTotal, currency)}
              </span>
            </summary>
            <div className={accordionBodyClass}>
              {lines.length === 0 ? (
                <p className="text-sm text-slate-500 py-2 text-center sm:text-left">
                  Nema stavki u ovoj kategoriji.
                </p>
              ) : (
                lines.map((line) => (
                  <div key={`${line.source}-${line.id}`} className={itemCardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Naziv troška
                        </p>
                        <h4 className="font-semibold text-slate-900 leading-snug">{line.label}</h4>
                      </div>
                      <div className="shrink-0 w-full sm:w-auto sm:min-w-[160px]">
                        <label className="sr-only" htmlFor={`adm-status-${line.id}`}>
                          Status
                        </label>
                        <select
                          id={`adm-status-${line.id}`}
                          value={line.status}
                          onChange={(e) => {
                            const v = e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu'
                            if (line.source === 'template') {
                              handleTemplateStatusChange(line.id, v)
                            } else {
                              handleCustomAdminStatusChange(line.id, v)
                            }
                          }}
                          className={statusSelectClass}
                        >
                          <option value="U planu">U planu</option>
                          <option value="Plaćeno">Plaćeno</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Iznos</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatMoney(line.amountRsd, currency)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          line.status === 'Plaćeno'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {line.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'}
                      </span>
                      {line.source === 'custom' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomAdmin(line.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800 min-h-[44px] px-2"
                        >
                          Ukloni
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        ))}
      </div>

      {troskovi.length > 0 && (
        <div className="mb-8 flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
          <div className="flex-1 min-h-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend
                  wrapperStyle={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:w-72 shrink-0 rounded-2xl border border-blue-100 bg-blue-50/90 p-6 space-y-2">
            <p className="text-sm font-medium text-slate-600">Pregled administracije</p>
            <p className="text-xl font-bold text-slate-800 tabular-nums">
              {formatMoney(ukupno, currency)}
            </p>
            {materialsTotal > 0 && (
              <>
                <p className="text-xs text-slate-500 pt-2 border-t border-blue-200">
                  Ukupno projekat (admin + materijal)
                </p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatMoney(ukupnoProjekat, currency)}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 pt-10 border-t border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">
          Materijal i radovi
        </h3>
        <p className="text-sm text-slate-500 text-center mb-6 max-w-xl mx-auto">
          Organizujte stavke po kategorijama; ukupan iznos ulazi u projekat i u arhivu.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Ukupno projektovano
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatMoney(materialsFinance.ukupnoProjektovano, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 mb-1">
              Realizovano
            </p>
            <p className="text-2xl font-bold text-emerald-900 tabular-nums">
              {formatMoney(materialsFinance.realizovano, currency)}
            </p>
            <p className="text-[11px] text-emerald-800/70 mt-1">Suma stavki sa statusom „Plaćeno“</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 mb-1">
              Preostalo za plaćanje
            </p>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">
              {formatMoney(materialsFinance.preostalo, currency)}
            </p>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end mb-6">
          <button
            type="button"
            onClick={() => setAddMaterialModalOpen(true)}
            className={primaryActionBtnClass}
          >
            + Nova stavka
          </button>
        </div>

        {addMaterialModalOpen && (
          <Modal onClose={() => setAddMaterialModalOpen(false)} panelClassName="max-w-lg">
            <div className="pr-8">
              <h4 className="text-lg font-bold text-slate-900 mb-1">Dodaj stavku</h4>
              <p className="text-sm text-slate-500 mb-5">Unesite podatke za materijal ili radove.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategorija</label>
                  <select
                    value={materialDraft.categoryId}
                    onChange={(e) =>
                      setMaterialDraft((d) => ({ ...d, categoryId: e.target.value }))
                    }
                    className={inputClasses}
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Naziv</label>
                  <input
                    type="text"
                    value={materialDraft.name}
                    onChange={(e) => setMaterialDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="npr. Cement, elektro instalacija"
                    className={inputClasses}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Jedinica</label>
                    <input
                      type="text"
                      value={materialDraft.unit}
                      onChange={(e) => setMaterialDraft((d) => ({ ...d, unit: e.target.value }))}
                      placeholder="t, m², kom"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Količina</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={materialDraft.quantity}
                      onChange={(e) => setMaterialDraft((d) => ({ ...d, quantity: e.target.value }))}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Jedinična cena (RSD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={materialDraft.unitPrice}
                    onChange={(e) => setMaterialDraft((d) => ({ ...d, unitPrice: e.target.value }))}
                    placeholder="0"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <select
                    value={materialDraft.status}
                    onChange={(e) =>
                      setMaterialDraft((d) => ({
                        ...d,
                        status: e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu',
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="U planu">U planu</option>
                    <option value="Plaćeno">Plaćeno</option>
                  </select>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddMaterialModalOpen(false)}
                    className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Otkaži
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
                  >
                    Dodaj stavku
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {materials.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center mb-6">
            <p className="text-slate-600 font-medium">Još nema stavki</p>
            <p className="text-sm text-slate-500 mt-1">
              Koristite „Nova stavka“ da dodate materijal ili radove po kategorijama.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {materialsByCategory.map(({ id, label, items, groupTotal }) => (
              <details key={id} className={accordionDetailsClass}>
                <summary className={accordionSummaryClass}>
                  <span className="flex items-center gap-2 min-w-0 font-semibold text-slate-800">
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                    {formatMoney(groupTotal, currency)}
                  </span>
                </summary>
                <div className={accordionBodyClass}>
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2 text-center sm:text-left">
                      Nema stavki u ovoj kategoriji.
                    </p>
                  ) : (
                    items.map((m) => (
                      <div key={m.id} className={itemCardClass}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Naziv stavke
                            </p>
                            <h4 className="font-semibold text-slate-900 leading-snug">{m.name}</h4>
                            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between gap-2 sm:block">
                                <dt className="text-slate-500">Količina</dt>
                                <dd className="font-medium text-slate-800 tabular-nums text-right sm:text-left">
                                  {Number(m.quantity).toLocaleString('sr-RS')}{' '}
                                  <span className="text-slate-600 font-normal">
                                    {m.unit ? m.unit : ''}
                                  </span>
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2 sm:block">
                                <dt className="text-slate-500">Jed. cena</dt>
                                <dd className="font-medium tabular-nums text-slate-800 text-right sm:text-left">
                                  {formatMoney(Number(m.unitPrice), currency)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <div className="shrink-0 w-full sm:w-auto sm:min-w-[160px]">
                            <label className="sr-only" htmlFor={`status-${m.id}`}>
                              Status
                            </label>
                            <select
                              id={`status-${m.id}`}
                              value={m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'}
                              onChange={(e) =>
                                handleMaterialStatusChange(
                                  m.id,
                                  e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu'
                                )
                              }
                              className={statusSelectClass}
                            >
                              <option value="U planu">U planu</option>
                              <option value="Plaćeno">Plaćeno</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Ukupno</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">
                              {formatMoney(Number(m.total), currency)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              m.status === 'Plaćeno'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(m.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-800 min-h-[44px] px-2"
                          >
                            Ukloni
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        <div className="rounded-xl border-2 border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600 mb-3">Rezime projekta</p>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-slate-600">Administrativni troškovi</span>
              <span className="font-semibold tabular-nums">{formatMoney(ukupno, currency)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-slate-600">Materijal i radovi</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(materialsTotal, currency)}
              </span>
            </li>
            <li className="flex justify-between gap-4 pt-2 border-t border-sky-200 text-base">
              <span className="font-bold text-slate-800">Ukupno projekat</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatMoney(ukupnoProjekat, currency)}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {isLoggedIn && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSacuvajProracun}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px]"
          >
            {saving ? 'Čuvanje...' : 'Sačuvaj proračun'}
          </button>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500 italic">
        Napomena: Ovo su okvirni iznosi. Tačne cifre zavise od zone gradnje i lokalnih odluka svake
        opštine.
      </p>
    </section>
  )
}
