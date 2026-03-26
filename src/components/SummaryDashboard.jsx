/**
 * Lepljivi pregled administrativnih iznosa: ukupno / plaćeno / preostalo (RSD).
 * Prima numeričke vrednosti; formatiranje je lokalno da komponenta ostane samostalna.
 */
function formatRsd(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('sr-RS')} RSD`
}

export default function SummaryDashboard({ total, paid, pending }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 sm:mx-0 mb-8 rounded-b-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-md backdrop-blur-md sm:rounded-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ukupno administrativno
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
            {formatRsd(total)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Plaćeno</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900 sm:text-xl">
            {formatRsd(paid)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-red-50/40 px-4 py-3 text-center sm:text-left ring-1 ring-amber-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">Preostalo</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-red-900 sm:text-xl">
            {formatRsd(pending)}
          </p>
        </div>
      </div>
    </div>
  )
}
