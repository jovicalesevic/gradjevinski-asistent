import { useState, useMemo } from 'react'
import axios from 'axios'
import { ChevronDown } from 'lucide-react'
import { API_USER_BASE } from '../config/api.js'
import {
  MATERIAL_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORY_ID,
  normalizeCategoryId,
} from '../data/materialCategories.js'
import Modal from './Modal'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const EUR_TO_RSD = 117
const REPUBLICKA_TAKSA_ZAHTEV = 900
const TAKSA_GRADJEVINSKA_DOZVOLA = 5000
const DOPRINOS_GRADSKO_ZEMLJISTE_PO_M2 = 2000

const inputClasses =
  'w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none'

const CHART_COLORS = ['#0088FE', '#00C49F', '#D35400', '#8884d8']

export default function KalkulatorAdministrativnihTroskova({ isLoggedIn, objectType, workType, municipality, onCalculationSaved }) {
  const [kvadratura, setKvadratura] = useState('')
  const [cenaArhitekte, setCenaArhitekte] = useState(15)

  const m2 = parseFloat(kvadratura) || 0

  const arhitektonskiProjekat = m2 * cenaArhitekte * EUR_TO_RSD
  const republickaTaksaZahtev = REPUBLICKA_TAKSA_ZAHTEV
  const taksaGradjevinskaDozvola = TAKSA_GRADJEVINSKA_DOZVOLA
  const doprinosGradskoZemljiste = m2 * DOPRINOS_GRADSKO_ZEMLJISTE_PO_M2

  const troskovi = [
    { vrsta: 'Arhitektonski projekat', iznos: arhitektonskiProjekat },
    { vrsta: 'Republička taksa za zahtev', iznos: republickaTaksaZahtev },
    { vrsta: 'Taksa za građevinsku dozvolu', iznos: taksaGradjevinskaDozvola },
    { vrsta: 'Doprinos za gradsko zemljište', iznos: doprinosGradskoZemljiste },
  ]

  const ukupno = troskovi.reduce((sum, t) => sum + t.iznos, 0)

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
      const title = [
        objectType || 'Objekt',
        workType || 'Radovi',
        municipality || 'Opština',
      ].filter(Boolean).join(' - ') || 'Administrativni troškovi'

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

  return (
    <section className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
        Kalkulator administrativnih troškova
      </h2>

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
          <div className="flex gap-4 items-center">
            <input
              id="cena-arhitekte"
              type="range"
              min="5"
              max="50"
              step="1"
              value={cenaArhitekte}
              onChange={(e) => setCenaArhitekte(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <input
              type="number"
              min="5"
              max="100"
              value={cenaArhitekte}
              onChange={(e) => {
                const val = Number(e.target.value)
                setCenaArhitekte(Math.min(100, Math.max(5, val || 5)))
              }}
              className="w-20 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-center text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <span className="text-slate-600 text-sm font-medium">EUR</span>
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Svi iznosi u tabeli prikazani su u RSD-u radi konzistentnosti.
      </p>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3">
        {troskovi.map((t, index) => (
          <div
            key={t.vrsta}
            className={`rounded-lg border border-slate-200 p-4 ${
              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
            }`}
          >
            <p className="text-sm font-medium text-slate-700">{t.vrsta}</p>
            <p className="mt-1 text-right text-slate-800 font-semibold tabular-nums">
              {t.iznos.toLocaleString('sr-RS')} RSD
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: table with overflow-x-auto */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[320px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Vrsta troška
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Iznos (RSD)
              </th>
            </tr>
          </thead>
          <tbody>
            {troskovi.map((t, index) => (
              <tr
                key={t.vrsta}
                className={
                  index % 2 === 0
                    ? 'bg-white border-b border-slate-100'
                    : 'bg-slate-50/50 border-b border-slate-100'
                }
              >
                <td className="px-4 py-3 text-slate-700">{t.vrsta}</td>
                <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                  {t.iznos.toLocaleString('sr-RS')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td className="px-4 py-3 text-sm font-bold text-slate-800">
                Ukupno
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                {ukupno.toLocaleString('sr-RS')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {troskovi.length > 0 && (
        <div className="mt-6 flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
          <div className="flex-1 min-h-[300px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={300}>
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
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${Number(value).toLocaleString('sr-RS')} RSD`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend
                  wrapperStyle={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:w-80 shrink-0 p-6 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
            <p className="text-sm font-medium text-slate-600">Administrativni troškovi</p>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">
              {ukupno.toLocaleString('sr-RS')} RSD
            </p>
            {materialsTotal > 0 && (
              <>
                <p className="text-xs text-slate-500 pt-2 border-t border-blue-200">Ukupno projekat (admin + materijal)</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{ukupnoProjekat.toLocaleString('sr-RS')} RSD</p>
              </>
            )}
          </div>
        </div>
      )}

      {ukupno === 0 && (
        <div className="mt-6 p-6 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-sm font-medium text-slate-600 mb-1">
            Ukupno administrativni troškovi
          </p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {ukupno.toLocaleString('sr-RS')} RSD
          </p>
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
              {materialsFinance.ukupnoProjektovano.toLocaleString('sr-RS')}{' '}
              <span className="text-lg font-semibold text-slate-600">RSD</span>
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 mb-1">
              Realizovano
            </p>
            <p className="text-2xl font-bold text-emerald-900 tabular-nums">
              {materialsFinance.realizovano.toLocaleString('sr-RS')}{' '}
              <span className="text-lg font-semibold text-emerald-800">RSD</span>
            </p>
            <p className="text-[11px] text-emerald-800/70 mt-1">Suma stavki sa statusom „Plaćeno“</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 mb-1">
              Preostalo za plaćanje
            </p>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">
              {materialsFinance.preostalo.toLocaleString('sr-RS')}{' '}
              <span className="text-lg font-semibold text-amber-900">RSD</span>
            </p>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end mb-6">
          <button
            type="button"
            onClick={() => setAddMaterialModalOpen(true)}
            className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-slate-800 text-white text-sm font-semibold shadow-md hover:bg-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
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
                    className={`${inputClasses} min-h-[48px]`}
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
                    className={`${inputClasses} min-h-[48px]`}
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
              <details
                key={id}
                className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 min-h-[52px] hover:bg-slate-50/90 transition-colors [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2 min-w-0 font-semibold text-slate-800">
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                    {groupTotal.toLocaleString('sr-RS')} RSD
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 space-y-3 bg-slate-50/40">
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2 text-center sm:text-left">
                      Nema stavki u ovoj kategoriji.
                    </p>
                  ) : (
                    items.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
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
                                  {Number(m.unitPrice).toLocaleString('sr-RS')} RSD
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
                              className="w-full min-h-[48px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
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
                              {Number(m.total).toLocaleString('sr-RS')} RSD
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
              <span className="font-semibold tabular-nums">{ukupno.toLocaleString('sr-RS')} RSD</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-slate-600">Materijal i radovi</span>
              <span className="font-semibold tabular-nums">{materialsTotal.toLocaleString('sr-RS')} RSD</span>
            </li>
            <li className="flex justify-between gap-4 pt-2 border-t border-sky-200 text-base">
              <span className="font-bold text-slate-800">Ukupno projekat</span>
              <span className="font-bold text-slate-900 tabular-nums">{ukupnoProjekat.toLocaleString('sr-RS')} RSD</span>
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
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? 'Čuvanje...' : 'Sačuvaj proračun'}
          </button>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500 italic">
        Napomena: Ovo su okvirni iznosi. Tačne cifre zavise od zone gradnje i
        lokalnih odluka svake opštine.
      </p>
    </section>
  )
}
