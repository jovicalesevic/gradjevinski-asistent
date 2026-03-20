import { useState, useMemo } from 'react'
import axios from 'axios'
import { API_USER_BASE } from '../config/api.js'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const EUR_TO_RSD = 117
const REPUBLICKA_TAKSA_ZAHTEV = 900
const TAKSA_GRADJEVINSKA_DOZVOLA = 5000
const DOPRINOS_GRADSKO_ZEMLJISTE_PO_M2 = 2000

const inputClasses =
  'w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none'

const inputCompact =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none'

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
    name: '',
    unit: '',
    quantity: '',
    unitPrice: '',
  })
  const [materials, setMaterials] = useState([])

  const materialsTotal = useMemo(
    () => materials.reduce((sum, m) => sum + (Number(m.total) || 0), 0),
    [materials]
  )
  const ukupnoProjekat = ukupno + materialsTotal

  const chartData = troskovi.map((item) => ({
    name: item.vrsta,
    value: item.iznos,
  }))
  console.log('Chart Data:', chartData)

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
    setMaterials((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `m-${Date.now()}-${prev.length}`,
        name,
        unit: materialDraft.unit.trim(),
        quantity,
        unitPrice,
        total,
      },
    ])
    setMaterialDraft({ name: '', unit: '', quantity: '', unitPrice: '' })
  }

  const handleRemoveMaterial = (id) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
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

      const materialsPayload = materials.map(({ name, unit, quantity, unitPrice, total }) => ({
        name,
        unit,
        quantity,
        unitPrice,
        total,
      }))

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
        <p className="text-sm text-slate-500 text-center mb-6">
          Dodajte stavke materijala; ukupan iznos ulazi u projekat i u arhivu.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mb-4 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Naziv</label>
            <input
              type="text"
              value={materialDraft.name}
              onChange={(e) => setMaterialDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="npr. Cement"
              className={inputCompact}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Jedinica</label>
            <input
              type="text"
              value={materialDraft.unit}
              onChange={(e) => setMaterialDraft((d) => ({ ...d, unit: e.target.value }))}
              placeholder="t, m², kom"
              className={inputCompact}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Količina</label>
            <input
              type="number"
              min="0"
              step="any"
              value={materialDraft.quantity}
              onChange={(e) => setMaterialDraft((d) => ({ ...d, quantity: e.target.value }))}
              placeholder="0"
              className={inputCompact}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Cena (RSD / jm)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={materialDraft.unitPrice}
              onChange={(e) => setMaterialDraft((d) => ({ ...d, unitPrice: e.target.value }))}
              placeholder="0"
              className={inputCompact}
            />
          </div>
          <div className="lg:col-span-3">
            <button
              type="button"
              onClick={handleAddMaterial}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors"
            >
              Dodaj
            </button>
          </div>
        </div>

        {materials.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm mb-4">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Naziv</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Jm</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-700">Kol.</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-700">Cena</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-700">Ukupno</th>
                  <th className="px-3 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {materials.map((m, index) => (
                  <tr
                    key={m.id}
                    className={index % 2 === 0 ? 'bg-white border-b border-slate-100' : 'bg-slate-50/50 border-b border-slate-100'}
                  >
                    <td className="px-3 py-2.5 text-slate-800">{m.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.unit || '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{Number(m.quantity).toLocaleString('sr-RS')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{Number(m.unitPrice).toLocaleString('sr-RS')}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{Number(m.total).toLocaleString('sr-RS')}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(m.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Ukloni
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-3 py-2.5 font-semibold text-slate-800">
                    Ukupno materijal i radovi
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                    {materialsTotal.toLocaleString('sr-RS')} RSD
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
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
