import { useState, useMemo, useCallback } from 'react'
import axios from 'axios'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
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

function formatRsd(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('sr-RS')} RSD`
}

function isMongoId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)
}

function mapServerMaterialsToLocal(materials) {
  return (materials || []).map((m) => ({
    id: String(m._id ?? m.id),
    categoryId: normalizeCategoryId(m.category || m.categoryId || 'ostalo'),
    name: m.name,
    unit: m.unit || '',
    quantity: Number(m.quantity) || 0,
    unitPrice: Number(m.unitPrice) || 0,
    total: Number(m.total) || 0,
    status: m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
  }))
}

function materialsFromSavedResponse(savedCalculations, calcId) {
  const c = savedCalculations?.find((x) => String(x._id) === String(calcId))
  return c ? mapServerMaterialsToLocal(c.materials) : null
}

/** Ručno dodate admin. stavke iz sačuvanog proračuna (bez šablonskih naziva) */
function mapServerCustomAdminItems(calc) {
  if (!calc?.items?.length) return []
  const templateLabels = new Set(ADMIN_TEMPLATE_ITEM_DEFS.map((d) => d.label))
  return calc.items
    .filter((si) => si && si._id && !templateLabels.has(String(si.vrsta || '').trim()))
    .map((si) => ({
      id: String(si._id),
      categoryId: normalizeAdminCategoryId(si.category || 'ostalo'),
      name: si.vrsta,
      amountRsd: Number(si.iznos) || 0,
      status: si.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    }))
}

function customAdminFromSavedResponse(savedCalculations, calcId) {
  const c = savedCalculations?.find((x) => String(x._id) === String(calcId))
  return c ? mapServerCustomAdminItems(c) : null
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

  const [adminItemStatus, setAdminItemStatus] = useState({})
  const [customAdminItems, setCustomAdminItems] = useState([])
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false)
  const [editingAdminItemId, setEditingAdminItemId] = useState(null)
  const [adminSyncingId, setAdminSyncingId] = useState(null)
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
  /** Poslednji sačuvan proračun na serveru — omogućava PUT/DELETE materijala po Mongo ID-u */
  const [syncedCalculationId, setSyncedCalculationId] = useState(null)
  /** `null` = novi unos, inače `id` stavke koja se menja */
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [materialSyncingId, setMaterialSyncingId] = useState(null)

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

  const resetAdminDraft = useCallback(() => {
    setAdminDraft({
      categoryId: DEFAULT_ADMIN_CATEGORY_ID,
      name: '',
      amount: '',
      status: 'U planu',
    })
  }, [])

  const closeAdminModal = useCallback(() => {
    setAddAdminModalOpen(false)
    setEditingAdminItemId(null)
    resetAdminDraft()
  }, [resetAdminDraft])

  const openAddAdminModal = () => {
    setEditingAdminItemId(null)
    resetAdminDraft()
    setAddAdminModalOpen(true)
  }

  const openEditAdminModal = (line) => {
    if (line.source !== 'custom') return
    const c = customAdminItems.find((x) => x.id === line.id)
    if (!c) return
    setEditingAdminItemId(c.id)
    setAdminDraft({
      categoryId: normalizeAdminCategoryId(c.categoryId),
      name: c.name,
      amount: String(c.amountRsd ?? ''),
      status: c.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    })
    setAddAdminModalOpen(true)
  }

  const handleSubmitAdmin = async () => {
    const name = adminDraft.name.trim()
    if (!name) {
      alert('Unesite naziv troška.')
      return
    }
    const amountRsd = Math.max(0, Number(adminDraft.amount) || 0)
    const categoryId = normalizeAdminCategoryId(adminDraft.categoryId)
    const status = adminDraft.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'
    const email = localStorage.getItem('userEmail')

    if (editingAdminItemId) {
      if (
        isLoggedIn &&
        email &&
        syncedCalculationId &&
        isMongoId(editingAdminItemId)
      ) {
        setAdminSyncingId(editingAdminItemId)
        try {
          const { data } = await axios.put(
            `${API_USER_BASE}/calculations/${encodeURIComponent(email)}/${syncedCalculationId}/items/${editingAdminItemId}`,
            {
              vrsta: name,
              iznos: amountRsd,
              category: categoryId,
              status,
            }
          )
          const merged = customAdminFromSavedResponse(data?.savedCalculations, syncedCalculationId)
          if (merged) setCustomAdminItems(merged)
          else {
            setCustomAdminItems((prev) =>
              prev.map((c) =>
                c.id === editingAdminItemId
                  ? { ...c, name, amountRsd, categoryId, status }
                  : c
              )
            )
          }
          onCalculationSaved?.()
        } catch (err) {
          alert(err.response?.data?.error || 'Greška pri ažuriranju troška.')
        } finally {
          setAdminSyncingId(null)
        }
      } else {
        setCustomAdminItems((prev) =>
          prev.map((c) =>
            c.id === editingAdminItemId
              ? { ...c, name, amountRsd, categoryId, status }
              : c
          )
        )
      }
      closeAdminModal()
      return
    }

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
    closeAdminModal()
  }

  const handleRemoveCustomAdmin = async (id) => {
    if (!window.confirm('Da li si siguran?')) return
    const email = localStorage.getItem('userEmail')

    if (isLoggedIn && email && syncedCalculationId && isMongoId(id)) {
      setAdminSyncingId(id)
      try {
        const { data } = await axios.delete(
          `${API_USER_BASE}/calculations/${encodeURIComponent(email)}/${syncedCalculationId}/items/${id}`
        )
        const merged = customAdminFromSavedResponse(data?.savedCalculations, syncedCalculationId)
        if (merged) setCustomAdminItems(merged)
        else setCustomAdminItems((prev) => prev.filter((c) => c.id !== id))
        onCalculationSaved?.()
      } catch (err) {
        alert(err.response?.data?.error || 'Greška pri brisanju troška.')
      } finally {
        setAdminSyncingId(null)
      }
    } else {
      setCustomAdminItems((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const resetMaterialDraft = useCallback(() => {
    setMaterialDraft({
      categoryId: DEFAULT_MATERIAL_CATEGORY_ID,
      name: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      status: 'U planu',
    })
  }, [])

  const closeMaterialModal = useCallback(() => {
    setAddMaterialModalOpen(false)
    setEditingMaterialId(null)
    resetMaterialDraft()
  }, [resetMaterialDraft])

  const openAddMaterialModal = () => {
    setEditingMaterialId(null)
    resetMaterialDraft()
    setAddMaterialModalOpen(true)
  }

  const openEditMaterialModal = (m) => {
    setEditingMaterialId(m.id)
    setMaterialDraft({
      categoryId: normalizeCategoryId(m.categoryId),
      name: m.name,
      unit: m.unit || '',
      quantity: String(m.quantity ?? ''),
      unitPrice: String(m.unitPrice ?? ''),
      status: m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    })
    setAddMaterialModalOpen(true)
  }

  const handleSubmitMaterial = async () => {
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
    const email = localStorage.getItem('userEmail')

    if (editingMaterialId) {
      if (
        isLoggedIn &&
        email &&
        syncedCalculationId &&
        isMongoId(editingMaterialId)
      ) {
        setMaterialSyncingId(editingMaterialId)
        try {
          // PUT /api/user/calculations/:email/:calculationId/materials/:materialId
          const { data } = await axios.put(
            `${API_USER_BASE}/calculations/${encodeURIComponent(email)}/${syncedCalculationId}/materials/${editingMaterialId}`,
            {
              name,
              unit: materialDraft.unit.trim(),
              quantity,
              unitPrice,
              total,
              category: categoryId,
              status,
            }
          )
          const merged = materialsFromSavedResponse(data?.savedCalculations, syncedCalculationId)
          if (merged) setMaterials(merged)
          else {
            setMaterials((prev) =>
              prev.map((m) =>
                m.id === editingMaterialId
                  ? { ...m, name, unit: materialDraft.unit.trim(), quantity, unitPrice, total, categoryId, status }
                  : m
              )
            )
          }
          onCalculationSaved?.()
        } catch (err) {
          alert(err.response?.data?.error || 'Greška pri ažuriranju stavke.')
        } finally {
          setMaterialSyncingId(null)
        }
      } else {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === editingMaterialId
              ? { ...m, name, unit: materialDraft.unit.trim(), quantity, unitPrice, total, categoryId, status }
              : m
          )
        )
      }
      closeMaterialModal()
      return
    }

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
    closeMaterialModal()
  }

  const handleDeleteMaterial = async (m) => {
    if (!window.confirm('Da li si siguran?')) return
    const email = localStorage.getItem('userEmail')

    if (isLoggedIn && email && syncedCalculationId && isMongoId(m.id)) {
      setMaterialSyncingId(m.id)
      try {
        const { data } = await axios.delete(
          `${API_USER_BASE}/calculations/${encodeURIComponent(email)}/${syncedCalculationId}/materials/${m.id}`
        )
        const merged = materialsFromSavedResponse(data?.savedCalculations, syncedCalculationId)
        if (merged) setMaterials(merged)
        else setMaterials((prev) => prev.filter((x) => x.id !== m.id))
        onCalculationSaved?.()
      } catch (err) {
        alert(err.response?.data?.error || 'Greška pri brisanju stavke.')
      } finally {
        setMaterialSyncingId(null)
      }
    } else {
      setMaterials((prev) => prev.filter((x) => x.id !== m.id))
    }
  }

  const handleMaterialBadgeToggle = async (m) => {
    const next = m.status === 'Plaćeno' ? 'U planu' : 'Plaćeno'
    const email = localStorage.getItem('userEmail')

    if (isLoggedIn && email && syncedCalculationId && isMongoId(m.id)) {
      setMaterialSyncingId(m.id)
      try {
        const { data } = await axios.put(
          `${API_USER_BASE}/calculations/${encodeURIComponent(email)}/${syncedCalculationId}/materials/${m.id}`,
          { status: next }
        )
        const merged = materialsFromSavedResponse(data?.savedCalculations, syncedCalculationId)
        if (merged) setMaterials(merged)
        else setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: next } : x)))
        onCalculationSaved?.()
      } catch (err) {
        alert(err.response?.data?.error || 'Greška pri promeni statusa.')
      } finally {
        setMaterialSyncingId(null)
      }
    } else {
      setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: next } : x)))
    }
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

      const { data } = await axios.post(`${API_USER_BASE}/save-calculation`, {
        email,
        title,
        totalAmount: ukupnoProjekat,
        items: troskovi,
        materials: materialsPayload,
        location: municipality || '',
      })
      const list = data?.user?.savedCalculations
      if (Array.isArray(list) && list.length > 0) {
        const last = list[list.length - 1]
        if (last?._id) {
          setSyncedCalculationId(String(last._id))
          setMaterials(mapServerMaterialsToLocal(last.materials))
          setCustomAdminItems(mapServerCustomAdminItems(last))
        }
      }
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
      <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
        Kalkulator administrativnih troškova
      </h2>

      {/* Sticky summary — svi iznosi u RSD */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 mb-8 rounded-b-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-md backdrop-blur-md sm:rounded-2xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Ukupno administrativno
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                {formatRsd(adminFinance.total)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Plaćeno
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900 sm:text-xl">
                {formatRsd(adminFinance.placeno)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-red-50/40 px-4 py-3 text-center sm:text-left ring-1 ring-amber-200/80">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                Preostalo
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-900 sm:text-xl">
                {formatRsd(adminFinance.preostalo)}
              </p>
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
        Takse, projekti i doprinosi po grupama. Svi iznosi u proračunu su u RSD.
      </p>

      <div className="flex justify-center sm:justify-end mb-6">
        <button type="button" onClick={openAddAdminModal} className={primaryActionBtnClass}>
          + Dodaj trošak
        </button>
      </div>

      {addAdminModalOpen && (
        <Modal onClose={closeAdminModal} panelClassName="max-w-lg">
          <div className="pr-8">
            <h4 className="text-lg font-bold text-slate-900 mb-1">
              {editingAdminItemId ? 'Izmeni trošak' : 'Novi administrativni trošak'}
            </h4>
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
                  onClick={closeAdminModal}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAdmin}
                  disabled={!!adminSyncingId}
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                >
                  {editingAdminItemId ? 'Sačuvaj izmene' : 'Dodaj'}
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
                {formatRsd(groupTotal)}
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
                          {formatRsd(line.amountRsd)}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditAdminModal(line)}
                            disabled={!!adminSyncingId}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                            Izmeni
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomAdmin(line.id)}
                            disabled={!!adminSyncingId}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                            Ukloni
                          </button>
                        </div>
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
                  formatter={(value) => formatRsd(Number(value))}
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
              {formatRsd(ukupno)}
            </p>
            {materialsTotal > 0 && (
              <>
                <p className="text-xs text-slate-500 pt-2 border-t border-blue-200">
                  Ukupno projekat (admin + materijal)
                </p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatRsd(ukupnoProjekat)}
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
              {formatRsd(materialsFinance.ukupnoProjektovano)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 mb-1">
              Realizovano
            </p>
            <p className="text-2xl font-bold text-emerald-900 tabular-nums">
              {formatRsd(materialsFinance.realizovano)}
            </p>
            <p className="text-[11px] text-emerald-800/70 mt-1">Suma stavki sa statusom „Plaćeno“</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 mb-1">
              Preostalo za plaćanje
            </p>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">
              {formatRsd(materialsFinance.preostalo)}
            </p>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end mb-6">
          <button type="button" onClick={openAddMaterialModal} className={primaryActionBtnClass}>
            + Nova stavka
          </button>
        </div>

        {addMaterialModalOpen && (
          <Modal onClose={closeMaterialModal} panelClassName="max-w-lg">
            <div className="pr-8">
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {editingMaterialId ? 'Izmeni stavku' : 'Dodaj stavku'}
              </h4>
              <p className="text-sm text-slate-500 mb-5">
                {editingMaterialId
                  ? 'Izmenite podatke i sačuvajte.'
                  : 'Unesite podatke za materijal ili radove.'}
              </p>
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
                    onClick={closeMaterialModal}
                    className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Otkaži
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitMaterial}
                    disabled={!!materialSyncingId}
                    className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 transition-colors disabled:opacity-60"
                  >
                    {editingMaterialId ? 'Sačuvaj izmene' : 'Dodaj stavku'}
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
                    {formatRsd(groupTotal)}
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
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Naziv stavke
                          </p>
                          <h4 className="font-semibold text-slate-900 leading-snug">{m.name}</h4>
                        </div>
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
                              {formatRsd(Number(m.unitPrice))}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Ukupno</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">
                              {formatRsd(Number(m.total))}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMaterialBadgeToggle(m)}
                            disabled={!!materialSyncingId}
                            className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-50 ${
                              m.status === 'Plaćeno'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'}
                          </button>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditMaterialModal(m)}
                              disabled={!!materialSyncingId}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                              Izmeni
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(m)}
                              disabled={!!materialSyncingId}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                              Ukloni
                            </button>
                          </div>
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
              <span className="font-semibold tabular-nums">{formatRsd(ukupno)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-slate-600">Materijal i radovi</span>
              <span className="font-semibold tabular-nums">
                {formatRsd(materialsTotal)}
              </span>
            </li>
            <li className="flex justify-between gap-4 pt-2 border-t border-sky-200 text-base">
              <span className="font-bold text-slate-800">Ukupno projekat</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatRsd(ukupnoProjekat)}
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
