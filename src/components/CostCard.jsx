import { memo, useCallback } from 'react'
import { Paperclip, Pencil, Trash2 } from 'lucide-react'

const itemCardClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
const statusSelectClass =
  'w-full min-h-[48px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none'
const btnEditSecondaryClass =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-transparent hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors'
const btnDeleteSecondaryClass =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 hover:text-red-800 disabled:opacity-50 disabled:pointer-events-none transition-colors'

function formatRsd(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('sr-RS')} RSD`
}

/**
 * Jedna ručna administrativna stavka: status, iznos, Izmeni / Ukloni.
 */
const CostCard = memo(function CostCard({
  lineId,
  label,
  amountRsd,
  status,
  imageUrl = '',
  isSyncing,
  onStatusToggle,
  onEdit,
  onDelete,
}) {
  const handleSelectChange = useCallback(
    (e) => {
      const v = e.target.value === 'Plaćeno' ? 'Plaćeno' : 'U planu'
      onStatusToggle(lineId, v)
    },
    [lineId, onStatusToggle]
  )

  const handleEditClick = useCallback(() => {
    onEdit(lineId)
  }, [lineId, onEdit])

  const handleDeleteClick = useCallback(() => {
    onDelete(lineId)
  }, [lineId, onDelete])

  return (
    <div className={itemCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Naziv troška</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
            <h4 className="min-w-0 font-semibold text-slate-900 leading-snug">{label}</h4>
            {imageUrl ? (
              <Paperclip
                className="w-4 h-4 text-blue-500 cursor-pointer ml-2 inline shrink-0"
                strokeWidth={2}
                aria-hidden
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(imageUrl, '_blank', 'noopener,noreferrer')
                }}
              />
            ) : null}
          </div>
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEditClick}
            disabled={isSyncing}
            className={btnEditSecondaryClass}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Izmeni
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
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

export default CostCard
