import { useState, useMemo, useCallback, memo, useRef } from 'react'
import axios from 'axios'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { API_USER_BASE } from '../config/api.js'
import { MATERIAL_CATEGORIES, normalizeCategoryId } from '../data/materialCategories.js'
import {
  ADMIN_COST_CATEGORIES,
  ADMIN_TEMPLATE_ITEM_DEFS,
  computeTemplateItemRsd,
  normalizeAdminCategoryId,
} from '../data/adminCostCategories.js'
import AddEditModal from './AddEditModal'
import SummaryDashboard from './SummaryDashboard'
import CostCard from './CostCard'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

/**
 * Kalkulator administrativnih troškova + materijala: lokalno stanje, sinhronizacija sa
 * `/api/user/calculations/...` kada postoji sačuvan proračun (`syncedCalculationId`).
 */

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

/** Jedinstveni stil za Izmeni / Ukloni u obe sekcije */
const btnEditSecondaryClass =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-transparent hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors'
const btnDeleteSecondaryClass =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 hover:text-red-800 disabled:opacity-50 disabled:pointer-events-none transition-colors'

/**
 * Zbir svih iznosa, zbir plaćenih i preostalo (ukupno − plaćeno).
 * Koristi se za administrativni i materijalni „dashboard”.
 */
function sumTotalsWithPaidFlag(items, getAmount, getIsPaid) {
  let total = 0
  let paid = 0
  for (const item of items) {
    const amt = Number(getAmount(item)) || 0
    total += amt
    if (getIsPaid(item)) paid += amt
  }
  return {
    total,
    paid,
    pending: Math.max(0, total - paid),
  }
}

function formatRsd(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('sr-RS')} RSD`
}

/**
 * Kartica jedne stavke materijala — memo da izmena jedne stavke ne forsira re-render ostalih.
 */
const MaterialLineCard = memo(function MaterialLineCard({
  item: m,
  isSyncing,
  onEdit,
  onDelete,
  onToggle,
}) {
  return (
    <div className={itemCardClass}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Naziv stavke</p>
        <h4 className="font-semibold text-slate-900 leading-snug">{m.name}</h4>
      </div>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-slate-500">Količina</dt>
          <dd className="font-medium text-slate-800 tabular-nums text-right sm:text-left">
            {Number(m.quantity).toLocaleString('sr-RS')}{' '}
            <span className="text-slate-600 font-normal">{m.unit ? m.unit : ''}</span>
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
          <p className="text-lg font-bold text-slate-900 tabular-nums">{formatRsd(Number(m.total))}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(m.id)}
          disabled={isSyncing}
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
            onClick={() => onEdit(m.id)}
            disabled={isSyncing}
            className={btnEditSecondaryClass}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Izmeni
          </button>
          <button
            type="button"
            onClick={() => onDelete(m.id)}
            disabled={isSyncing}
            className={btnDeleteSecondaryClass}
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Ukloni
          </button>
        </div>
      </div>
    </div>
  )
})

/**
 * Šablonska admin. stavka — memo da promena druge stavke ili materijala ne re-renderuje sve redove.
 */
const AdminTemplateLineCard = memo(function AdminTemplateLineCard({
  lineId,
  label,
  amountRsd,
  status,
  onStatusChange,
}) {
  const handleSelectChange = useCallback(
    (e) => {
      const v = e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu'
      onStatusChange(lineId, v)
    },
    [lineId, onStatusChange]
  )

  return (
    <div className={itemCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Naziv troška</p>
          <h4 className="font-semibold text-slate-900 leading-snug">{label}</h4>
        </div>
        <div className="shrink-0 w-full sm:w-auto sm:min-w-[160px]">
          <label className="sr-only" htmlFor={`adm-status-${lineId}`}>
            Status
          </label>
          <select
            id={`adm-status-${lineId}`}
            value={status}
            onChange={handleSelectChange}
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
          <p className="text-lg font-bold text-slate-900 tabular-nums">{formatRsd(amountRsd)}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            status === 'Plaćeno'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          {status === 'Plaćeno' ? 'Plaćeno' : 'U planu'}
        </span>
      </div>
    </div>
  )
})

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
    imageUrl: m.imageUrl || '',
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
      imageUrl: si.imageUrl || '',
    }))
}

function customAdminFromSavedResponse(savedCalculations, calcId) {
  const c = savedCalculations?.find((x) => String(x._id) === String(calcId))
  return c ? mapServerCustomAdminItems(c) : null
}

/**
 * Stranica kalkulatora: šablonski + ručni admin. troškovi, materijal po kategorijama,
 * dijagram i rezime; prijavljeni korisnik može da sačuva proračun na profil.
 */
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
  const customAdminRef = useRef(customAdminItems)
  customAdminRef.current = customAdminItems
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false)
  const [editingAdminItemId, setEditingAdminItemId] = useState(null)
  const [adminSyncingId, setAdminSyncingId] = useState(null)

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
      imageUrl: c.imageUrl || '',
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

  /** Zbir admin. linija: ukupno / plaćeno / preostalo */
  const adminFinance = useMemo(
    () =>
      sumTotalsWithPaidFlag(
        adminLinesFlat,
        (line) => line.amountRsd,
        (line) => getLineStatus(line) === 'Plaćeno'
      ),
    [adminLinesFlat, getLineStatus]
  )

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

  /** Stavke za POST save-calculation — uključuje imageUrl za ručne stavke */
  const itemsPayloadForSave = useMemo(() => {
    return adminLinesFlat.map((line) => {
      const status =
        line.source === 'custom'
          ? line.status === 'Plaćeno'
            ? 'Plaćeno'
            : 'U planu'
          : getLineStatus(line) === 'Plaćeno'
            ? 'Plaćeno'
            : 'U planu'
      const imageUrl =
        line.source === 'custom'
          ? customAdminItems.find((x) => x.id === line.id)?.imageUrl ?? ''
          : ''
      return {
        vrsta: line.label,
        iznos: line.amountRsd,
        category: line.categoryId,
        status,
        imageUrl,
      }
    })
  }, [adminLinesFlat, customAdminItems, getLineStatus])

  const ukupno = adminFinance.total

  const adminModalInitialValues = useMemo(() => {
    if (!editingAdminItemId) return null
    const c = customAdminItems.find((x) => x.id === editingAdminItemId)
    if (!c) return null
    return {
      categoryId: normalizeAdminCategoryId(c.categoryId),
      name: c.name,
      amount: String(c.amountRsd ?? ''),
      status: c.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
      imageUrl: c.imageUrl || '',
    }
  }, [editingAdminItemId, customAdminItems])

  const [materials, setMaterials] = useState([])
  const materialsRef = useRef(materials)
  materialsRef.current = materials
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false)
  /** Poslednji sačuvan proračun na serveru — omogućava PUT/DELETE materijala po Mongo ID-u */
  const [syncedCalculationId, setSyncedCalculationId] = useState(null)
  /** `null` = novi unos, inače `id` stavke koja se menja */
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [materialSyncingId, setMaterialSyncingId] = useState(null)

  const materialModalInitialValues = useMemo(() => {
    if (!editingMaterialId) return null
    const m = materials.find((x) => x.id === editingMaterialId)
    if (!m) return null
    return {
      categoryId: normalizeCategoryId(m.categoryId),
      name: m.name,
      unit: m.unit || '',
      quantity: String(m.quantity ?? ''),
      unitPrice: String(m.unitPrice ?? ''),
      status: m.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
      imageUrl: m.imageUrl || '',
    }
  }, [editingMaterialId, materials])

  /** Zbir materijala: ukupno / plaćeno / preostalo (isti oblik kao adminFinance) */
  const materialsFinance = useMemo(
    () =>
      sumTotalsWithPaidFlag(
        materials,
        (m) => m.total,
        (m) => m.status === 'Plaćeno'
      ),
    [materials]
  )

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

  const ukupnoProjekat = ukupno + materialsFinance.total

  const chartData = troskovi.map((item) => ({
    name: item.vrsta,
    value: item.iznos,
  }))

  const [saving, setSaving] = useState(false)

  const handleTemplateStatusChange = useCallback((lineId, status) => {
    setAdminItemStatus((prev) => ({
      ...prev,
      [lineId]: status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
    }))
  }, [])

  const handleCustomAdminStatusChange = useCallback((id, status) => {
    setCustomAdminItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: status === 'Plaćeno' ? 'Plaćeno' : 'U planu' } : c
      )
    )
  }, [])

  const closeAdminModal = useCallback(() => {
    setAddAdminModalOpen(false)
    setEditingAdminItemId(null)
  }, [])

  const openAddAdminModal = () => {
    setEditingAdminItemId(null)
    setAddAdminModalOpen(true)
  }

  /** Dodavanje/izmena ručne admin. stavke (validacija u AddEditModal; lokalno ili PUT) */
  const handleSubmitAdmin = useCallback(
    async ({ name, amountRsd, categoryId, status, imageUrl }) => {
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
              imageUrl: imageUrl || '',
            }
          )
          const merged = customAdminFromSavedResponse(data?.savedCalculations, syncedCalculationId)
          if (merged) setCustomAdminItems(merged)
          else {
            setCustomAdminItems((prev) =>
              prev.map((c) =>
                c.id === editingAdminItemId
                  ? { ...c, name, amountRsd, categoryId, status, imageUrl: imageUrl || '' }
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
              ? { ...c, name, amountRsd, categoryId, status, imageUrl: imageUrl || '' }
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
        imageUrl: imageUrl || '',
      },
    ])
    closeAdminModal()
  },
    [
      editingAdminItemId,
      isLoggedIn,
      syncedCalculationId,
      closeAdminModal,
      onCalculationSaved,
    ]
  )

  const handleRemoveCustomAdmin = useCallback(
    async (id) => {
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
    },
    [isLoggedIn, syncedCalculationId, onCalculationSaved]
  )

  /** Otvaranje modala za izmenu ručne stavke — ref da callback ostane stabilan za memo kartice */
  const handleCustomAdminEditById = useCallback((id) => {
    if (!customAdminRef.current.find((x) => x.id === id)) return
    setEditingAdminItemId(id)
    setAddAdminModalOpen(true)
  }, [])

  const handleCustomAdminDeleteById = useCallback(
    (id) => {
      void handleRemoveCustomAdmin(id)
    },
    [handleRemoveCustomAdmin]
  )

  const closeMaterialModal = useCallback(() => {
    setAddMaterialModalOpen(false)
    setEditingMaterialId(null)
  }, [])

  const openAddMaterialModal = () => {
    setEditingMaterialId(null)
    setAddMaterialModalOpen(true)
  }

  const openEditMaterialModal = useCallback((m) => {
    setEditingMaterialId(m.id)
    setAddMaterialModalOpen(true)
  }, [])

  /** Dodavanje/izmena stavke materijala (validacija u AddEditModal) */
  const handleSubmitMaterial = useCallback(
    async ({ name, unit, quantity, unitPrice, total, categoryId, status, imageUrl }) => {
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
              unit,
              quantity,
              unitPrice,
              total,
              category: categoryId,
              status,
              imageUrl: imageUrl || '',
            }
          )
          const merged = materialsFromSavedResponse(data?.savedCalculations, syncedCalculationId)
          if (merged) setMaterials(merged)
          else {
            setMaterials((prev) =>
              prev.map((m) =>
                m.id === editingMaterialId
                  ? { ...m, name, unit, quantity, unitPrice, total, categoryId, status, imageUrl: imageUrl || '' }
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
              ? { ...m, name, unit, quantity, unitPrice, total, categoryId, status, imageUrl: imageUrl || '' }
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
        unit,
        quantity,
        unitPrice,
        total,
        status,
        imageUrl: imageUrl || '',
      },
    ])
    closeMaterialModal()
  },
    [
      editingMaterialId,
      isLoggedIn,
      syncedCalculationId,
      closeMaterialModal,
      onCalculationSaved,
    ]
  )

  const handleDeleteMaterial = useCallback(
    async (m) => {
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
    },
    [isLoggedIn, syncedCalculationId, onCalculationSaved]
  )

  const handleMaterialBadgeToggle = useCallback(
    async (m) => {
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
    },
    [isLoggedIn, syncedCalculationId, onCalculationSaved]
  )

  /** Stabilni callback-i (id) + ref na listu — memo kartice se ne re-renderuju bez potrebe */
  const handleMaterialEditById = useCallback(
    (id) => {
      const m = materialsRef.current.find((x) => x.id === id)
      if (m) openEditMaterialModal(m)
    },
    [openEditMaterialModal]
  )

  const handleDeleteMaterialById = useCallback(
    (id) => {
      const m = materialsRef.current.find((x) => x.id === id)
      if (m) void handleDeleteMaterial(m)
    },
    [handleDeleteMaterial]
  )

  const handleToggleMaterialById = useCallback(
    (id) => {
      const m = materialsRef.current.find((x) => x.id === id)
      if (m) void handleMaterialBadgeToggle(m)
    },
    [handleMaterialBadgeToggle]
  )

  /** POST /api/user/save-calculation — čuva ceo proračun i usklađuje lokalne ID-jeve sa serverom */
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
        ({ name, unit, quantity, unitPrice, total, categoryId, status, imageUrl }) => ({
          name,
          unit,
          quantity,
          unitPrice,
          total,
          category: categoryId || 'ostalo',
          status: status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
          imageUrl: imageUrl || '',
        })
      )

      const { data } = await axios.post(`${API_USER_BASE}/save-calculation`, {
        email,
        title,
        totalAmount: ukupnoProjekat,
        items: itemsPayloadForSave,
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

      <SummaryDashboard
        total={adminFinance.total}
        paid={adminFinance.paid}
        pending={adminFinance.pending}
      />

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

      <AddEditModal
        variant="admin"
        open={addAdminModalOpen}
        onClose={closeAdminModal}
        editingId={editingAdminItemId}
        initialValues={adminModalInitialValues}
        onSubmit={handleSubmitAdmin}
        submitDisabled={!!adminSyncingId}
      />

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
                lines.map((line) =>
                  line.source === 'template' ? (
                    <AdminTemplateLineCard
                      key={`template-${line.id}`}
                      lineId={line.id}
                      label={line.label}
                      amountRsd={line.amountRsd}
                      status={line.status}
                      onStatusChange={handleTemplateStatusChange}
                    />
                  ) : (
                    <CostCard
                      key={`custom-${line.id}`}
                      lineId={line.id}
                      label={line.label}
                      amountRsd={line.amountRsd}
                      status={line.status}
                      imageUrl={line.imageUrl || ''}
                      isSyncing={!!adminSyncingId}
                      onStatusToggle={handleCustomAdminStatusChange}
                      onEdit={handleCustomAdminEditById}
                      onDelete={handleCustomAdminDeleteById}
                    />
                  )
                )
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
            {materialsFinance.total > 0 && (
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
              {formatRsd(materialsFinance.total)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 mb-1">
              Realizovano
            </p>
            <p className="text-2xl font-bold text-emerald-900 tabular-nums">
              {formatRsd(materialsFinance.paid)}
            </p>
            <p className="text-[11px] text-emerald-800/70 mt-1">Suma stavki sa statusom „Plaćeno“</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 mb-1">
              Preostalo za plaćanje
            </p>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">
              {formatRsd(materialsFinance.pending)}
            </p>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end mb-6">
          <button type="button" onClick={openAddMaterialModal} className={primaryActionBtnClass}>
            + Nova stavka
          </button>
        </div>

        <AddEditModal
          variant="material"
          open={addMaterialModalOpen}
          onClose={closeMaterialModal}
          editingId={editingMaterialId}
          initialValues={materialModalInitialValues}
          onSubmit={handleSubmitMaterial}
          submitDisabled={!!materialSyncingId}
        />

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
                      <MaterialLineCard
                        key={m.id}
                        item={m}
                        isSyncing={!!materialSyncingId}
                        onEdit={handleMaterialEditById}
                        onDelete={handleDeleteMaterialById}
                        onToggle={handleToggleMaterialById}
                      />
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
                {formatRsd(materialsFinance.total)}
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
