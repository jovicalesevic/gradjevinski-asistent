import { useState, useEffect, useCallback } from 'react'
import { Camera, Check } from 'lucide-react'
import Modal from './Modal'
import {
  ADMIN_COST_CATEGORIES,
  DEFAULT_ADMIN_CATEGORY_ID,
  normalizeAdminCategoryId,
} from '../data/adminCostCategories.js'
import {
  MATERIAL_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORY_ID,
  normalizeCategoryId,
} from '../data/materialCategories.js'

const CLOUD_NAME = 'dsarfjqjp'
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
const CLOUDINARY_UPLOAD_PRESET = 'građevinski_asistent_preset'

const inputClasses =
  'w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none'

function validateStrictPositive(raw, fieldLabel) {
  const s = String(raw ?? '').trim()
  if (s === '') {
    alert(`Polje „${fieldLabel}” ne sme biti prazno.`)
    return null
  }
  const n = Number(s)
  if (Number.isNaN(n) || n <= 0) {
    alert(`„${fieldLabel}” mora biti pozitivan broj.`)
    return null
  }
  return n
}

function emptyAdminDraft() {
  return {
    categoryId: DEFAULT_ADMIN_CATEGORY_ID,
    name: '',
    amount: '',
    status: 'U planu',
  }
}

function emptyMaterialDraft() {
  return {
    categoryId: DEFAULT_MATERIAL_CATEGORY_ID,
    name: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    status: 'U planu',
    imageUrl: '',
  }
}

/**
 * Univerzalni modal za dodavanje / izmenu stavke (admin trošak ili materijal).
 * Draft stanje je unutra; roditelj prosleđuje `editingId`, `initialValues` i `onSubmit`.
 */
export default function AddEditModal({
  variant,
  open,
  onClose,
  editingId,
  initialValues,
  onSubmit,
  submitDisabled,
}) {
  const [draft, setDraft] = useState(() =>
    variant === 'admin' ? emptyAdminDraft() : emptyMaterialDraft()
  )
  const [isUploading, setIsUploading] = useState(false)
  /** Kratka potvrda nakon uspešnog uploada (checkmark) */
  const [uploadComplete, setUploadComplete] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsUploading(false)
      setUploadComplete(false)
      return
    }
    if (variant === 'admin') {
      if (editingId && initialValues) {
        setDraft({
          categoryId: normalizeAdminCategoryId(initialValues.categoryId ?? DEFAULT_ADMIN_CATEGORY_ID),
          name: String(initialValues.name ?? ''),
          amount: String(initialValues.amount ?? ''),
          status: initialValues.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
        })
      } else {
        setDraft(emptyAdminDraft())
      }
    } else {
      if (editingId && initialValues) {
        setDraft({
          categoryId: normalizeCategoryId(initialValues.categoryId ?? DEFAULT_MATERIAL_CATEGORY_ID),
          name: String(initialValues.name ?? ''),
          unit: String(initialValues.unit ?? ''),
          quantity: String(initialValues.quantity ?? ''),
          unitPrice: String(initialValues.unitPrice ?? ''),
          status: initialValues.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
          imageUrl: String(initialValues.imageUrl ?? '').trim(),
        })
      } else {
        setDraft(emptyMaterialDraft())
      }
    }
  }, [open, variant, editingId, initialValues])

  const handleImageUpload = useCallback(async (file) => {
    if (!file?.type?.startsWith('image/')) {
      alert('Izaberite sliku (npr. PNG ili JPG).')
      return
    }
    setIsUploading(true)
    setUploadComplete(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      /* cloud name je u URL-u (v1_1/dsarfjqjp/...); Cloudinary ne traži cloud_name u telu za unsigned upload */
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Otpremanje nije uspelo.')
      }
      if (data.secure_url) {
        setDraft((d) => ({ ...d, imageUrl: data.secure_url }))
        setUploadComplete(true)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Greška pri otpremanju slike.')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleSubmit = async () => {
    if (variant === 'admin') {
      const name = draft.name.trim()
      if (!name) {
        alert('Unesite naziv troška.')
        return
      }
      const amountRsd = validateStrictPositive(draft.amount, 'Iznos (RSD)')
      if (amountRsd === null) return
      const categoryId = normalizeAdminCategoryId(draft.categoryId)
      const status = draft.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'
      await onSubmit({ name, amountRsd, categoryId, status })
      return
    }
    const imageUrl = String(draft.imageUrl ?? '').trim()
    const name = draft.name.trim()
    if (!name) {
      alert('Unesite naziv materijala.')
      return
    }
    const quantity = validateStrictPositive(draft.quantity, 'Količina')
    if (quantity === null) return
    const unitPrice = validateStrictPositive(draft.unitPrice, 'Jedinična cena (RSD)')
    if (unitPrice === null) return
    const total = quantity * unitPrice
    const categoryId = normalizeCategoryId(draft.categoryId)
    const status = draft.status === 'Plaćeno' ? 'Plaćeno' : 'U planu'
    await onSubmit({
      name,
      unit: draft.unit.trim(),
      quantity,
      unitPrice,
      total,
      categoryId,
      status,
      imageUrl,
    })
  }

  const saveDisabled = submitDisabled || isUploading

  const receiptBlock = (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Slika računa (opciono)</p>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={`receipt-upload-${variant}`}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-100 ${
            isUploading || submitDisabled ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Camera className="h-5 w-5 shrink-0 text-slate-600" strokeWidth={2} aria-hidden />
          Dodaj sliku računa
        </label>
        <input
          id={`receipt-upload-${variant}`}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={isUploading || !!submitDisabled}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void handleImageUpload(f)
          }}
        />
        {isUploading ? (
          <span className="text-sm text-slate-600" role="status" aria-live="polite">
            Otpremanje slike…
          </span>
        ) : null}
        {!isUploading && uploadComplete && draft.imageUrl ? (
          <span
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"
            aria-label="Slika je otpremljena"
          >
            <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
            Gotovo
          </span>
        ) : null}
      </div>
      {draft.imageUrl ? (
        <div className="flex items-start gap-3 pt-1">
          <img
            src={draft.imageUrl}
            alt="Pregled slike računa"
            className="h-16 max-w-[200px] rounded-lg border border-slate-200 object-contain bg-white"
          />
        </div>
      ) : null}
    </div>
  )

  if (!open) return null

  const isEdit = Boolean(editingId)

  if (variant === 'admin') {
    return (
      <Modal onClose={onClose} panelClassName="max-w-lg">
        <div className="pr-8">
          <h4 className="text-lg font-bold text-slate-900 mb-1">
            {isEdit ? 'Izmeni trošak' : 'Novi administrativni trošak'}
          </h4>
          <p className="text-sm text-slate-500 mb-5">Iznos unesite u RSD.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategorija</label>
              <select
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
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
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
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
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({
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
                onClick={onClose}
                className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitDisabled}
                className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {isEdit ? 'Sačuvaj izmene' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} panelClassName="max-w-lg">
      <div className="pr-8">
        <h4 className="text-lg font-bold text-slate-900 mb-1">
          {isEdit ? 'Izmeni stavku' : 'Dodaj stavku'}
        </h4>
        <p className="text-sm text-slate-500 mb-5">
          {isEdit ? 'Izmenite podatke i sačuvajte.' : 'Unesite podatke za materijal ili radove.'}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategorija</label>
            <select
              value={draft.categoryId}
              onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
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
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
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
                value={draft.unit}
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
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
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
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
              value={draft.unitPrice}
              onChange={(e) => setDraft((d) => ({ ...d, unitPrice: e.target.value }))}
              placeholder="0"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
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
          {receiptBlock}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saveDisabled}
              className="flex-1 min-h-[48px] rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 transition-colors disabled:opacity-60"
            >
              {isEdit ? 'Sačuvaj izmene' : 'Dodaj stavku'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
