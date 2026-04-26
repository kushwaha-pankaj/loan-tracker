import { useState, useCallback, useMemo } from 'react'
import {
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUp,
  ArrowDown,
  Receipt,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import Sheet from './Sheet'
import { calculateLoanMetrics, formatNPR, riskLevel, sortPayments, toYmd } from '../utils/calculations'
import {
  BS_MONTHS,
  BS_YEAR_RANGE,
  bsMonthDays,
  bsToIso,
  formatDateBilingual,
  formatDateShort,
  isoToBs,
} from '../utils/nepaliDate'

const TYPE_BADGE = {
  person: 'badge-person',
  cooperative: 'badge-cooperative',
  bank: 'badge-bank',
  microfinance: 'badge-microfinance',
}

const TYPE_LABEL = {
  person: 'Person',
  cooperative: 'Cooperative',
  bank: 'Bank',
  microfinance: 'Microfinance',
}

/** AD calendar line for payment rows (ISO stored as AD). */
function formatAdShort(isoStr) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function localTodayYmd() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function pad2(n) {
  return String(Math.max(0, Math.floor(Number(n)))).padStart(2, '0')
}

function adDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function clampIso(iso, minDate, maxDate) {
  if (!iso) return minDate
  const s = iso.slice(0, 10)
  if (s < minDate) return minDate
  if (s > maxDate) return maxDate
  return s
}

const AD_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** AD date without native `type="date"` (avoids unstyled browser calendar popover). */
function AdDateSelects({ value, onChange, minDate, maxDate, disabled, idPrefix }) {
  const minParts = minDate.split('-').map(Number)
  const maxParts = maxDate.split('-').map(Number)
  const clamped = clampIso((value || minDate).slice(0, 10), minDate, maxDate)
  let [y, m, d] = clamped.split('-').map(Number)

  const years = []
  for (let yy = minParts[0]; yy <= maxParts[0]; yy++) years.push(yy)

  const monthStart = y === minParts[0] ? minParts[1] : 1
  const monthEnd = y === maxParts[0] ? maxParts[1] : 12

  const dimCur = adDaysInMonth(y, m)
  let dayStart = 1
  let dayEnd = dimCur
  if (y === minParts[0] && m === minParts[1]) dayStart = minParts[2]
  if (y === maxParts[0] && m === maxParts[1]) dayEnd = maxParts[2]

  function commit(ny, nm, nd) {
    const dimM = adDaysInMonth(ny, nm)
    let dd = Math.min(dimM, Math.max(1, nd))
    let next = `${ny}-${pad2(nm)}-${pad2(dd)}`
    next = clampIso(next, minDate, maxDate)
    onChange(next)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        id={`${idPrefix}-ad-y`}
        className="input-field text-sm min-h-[44px]"
        aria-label="Year (AD)"
        value={y}
        disabled={disabled}
        onChange={(e) => commit(Number(e.target.value), m, d)}
      >
        {years.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ad-m`}
        className="input-field text-sm min-h-[44px]"
        aria-label="Month (AD)"
        value={m}
        disabled={disabled}
        onChange={(e) => commit(y, Number(e.target.value), d)}
      >
        {Array.from({ length: monthEnd - monthStart + 1 }, (_, i) => monthStart + i).map((mm) => (
          <option key={mm} value={mm}>
            {AD_MONTH_LABELS[mm - 1]}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ad-d`}
        className="input-field text-sm min-h-[44px]"
        aria-label="Day (AD)"
        value={d}
        disabled={disabled}
        onChange={(e) => commit(y, m, Number(e.target.value))}
      >
        {Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i).map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
    </div>
  )
}

function PaymentHistoryBlock({ loan, className = 'col-span-2 sm:col-span-4', onSaveLoan }) {
  const minDate = useMemo(() => (toYmd(loan.loanDate) || '2000-01-01').slice(0, 10), [loan.loanDate])
  const maxDate = localTodayYmd()
  const minBs = useMemo(() => isoToBs(minDate), [minDate])
  const maxBs = useMemo(() => isoToBs(maxDate), [maxDate])

  const payHistory = useMemo(
    () =>
      sortPayments(loan.payments)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || (b.id || '').localeCompare(a.id || '')),
    [loan.payments],
  )
  const totalPaid = useMemo(() => payHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payHistory])

  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ date: '', amount: '', note: '' })
  const [editDateMode, setEditDateMode] = useState('bs')
  const [bsYear, setBsYear] = useState(2082)
  const [bsMonth, setBsMonth] = useState(1)
  const [bsDay, setBsDay] = useState(1)
  const [pending, setPending] = useState(false)
  const [editError, setEditError] = useState('')
  const [paymentToDelete, setPaymentToDelete] = useState(null)

  const daysInBsMonth = bsMonthDays(bsYear, bsMonth)

  const startEdit = useCallback(
    (p) => {
      const initial = clampIso((p.date || minDate).slice(0, 10), minDate, maxDate)
      setEditingId(p.id)
      setDraft({
        date: initial,
        amount: String(p.amount ?? ''),
        note: p.note || '',
      })
      setEditDateMode('bs')
      const nb = isoToBs(initial)
      if (nb) {
        setBsYear(nb.year)
        setBsMonth(nb.month)
        setBsDay(nb.day)
      }
      setEditError('')
    },
    [minDate, maxDate],
  )

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditError('')
  }, [])

  function setPaymentDateIso(iso) {
    const c = clampIso((iso || minDate).slice(0, 10), minDate, maxDate)
    setDraft((d) => ({ ...d, date: c }))
    const nb = isoToBs(c)
    if (nb) {
      setBsYear(nb.year)
      setBsMonth(nb.month)
      setBsDay(nb.day)
    }
  }

  function applyEditBsDate(y, m, day) {
    const safeDay = Math.min(day, bsMonthDays(y, m))
    const iso = bsToIso(y, m, safeDay)
    if (!iso) return
    setPaymentDateIso(iso)
  }

  const commitEdit = useCallback(async () => {
    if (!onSaveLoan || !editingId) return
    const amt = Math.round(Number.parseFloat(String(draft.amount).replace(/,/g, '')) || 0)
    if (!draft.date) {
      setEditError('Choose a payment date.')
      return
    }
    if (amt <= 0) {
      setEditError('Amount must be greater than zero.')
      return
    }
    setPending(true)
    setEditError('')
    try {
      const next = (loan.payments || []).map((x) =>
        x.id === editingId
          ? {
              ...x,
              date: draft.date.slice(0, 10),
              amount: amt,
              note: draft.note.trim() || undefined,
            }
          : x,
      )
      await onSaveLoan({ ...loan, payments: sortPayments(next) })
      setEditingId(null)
    } catch {
      setEditError('Could not save. Try again.')
    } finally {
      setPending(false)
    }
  }, [onSaveLoan, editingId, draft, loan])

  const performDeletePayment = useCallback(async () => {
    if (!onSaveLoan || !paymentToDelete) return
    setPending(true)
    try {
      const next = (loan.payments || []).filter((x) => x.id !== paymentToDelete.id)
      await onSaveLoan({ ...loan, payments: sortPayments(next) })
      if (editingId === paymentToDelete.id) setEditingId(null)
      setPaymentToDelete(null)
    } finally {
      setPending(false)
    }
  }, [onSaveLoan, loan, paymentToDelete, editingId])

  if (!payHistory.length) return null

  return (
    <>
    <div
      className={`${className} rounded-xl border border-slate-200/90 bg-white shadow-sm px-3 py-3 sm:px-4`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
        <div>
          <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Payment history</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {payHistory.length} {payHistory.length === 1 ? 'repayment' : 'repayments'}
            {totalPaid > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-slate-700 currency tabular-nums">{formatNPR(totalPaid)}</span>
                {' total'}
              </>
            )}
          </p>
        </div>
      </div>
      <ul className="space-y-2" aria-label="Payment history">
        {payHistory.map((p) => {
          const isEditing = editingId === p.id
          return (
            <li
              key={p.id}
              className="rounded-lg border border-slate-100 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5"
            >
              {isEditing ? (
                <div className="space-y-3 rounded-xl border border-nepal-red/15 bg-red-50/30 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Editing repayment</p>
                    <span className="text-[11px] text-slate-500 tabular-nums">{formatDateShort(p.date)}</span>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Payment date</label>
                    <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setEditDateMode('bs')
                          const nb = isoToBs(clampIso(draft.date.slice(0, 10), minDate, maxDate))
                          if (nb) {
                            setBsYear(nb.year)
                            setBsMonth(nb.month)
                            setBsDay(nb.day)
                          }
                        }}
                        aria-pressed={editDateMode === 'bs'}
                        disabled={pending}
                        className={`px-3.5 py-2 min-h-[38px] transition-colors duration-180 disabled:opacity-50 ${
                          editDateMode === 'bs'
                            ? 'bg-nepal-red text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        BS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditDateMode('ad')
                          setPaymentDateIso(draft.date)
                        }}
                        aria-pressed={editDateMode === 'ad'}
                        disabled={pending}
                        className={`px-3.5 py-2 min-h-[38px] transition-colors duration-180 disabled:opacity-50 ${
                          editDateMode === 'ad'
                            ? 'bg-nepal-red text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        AD
                      </button>
                    </div>

                    {editDateMode === 'bs' ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                          <select
                            className="input-field text-sm min-h-[44px] pr-10"
                            aria-label="Payment year (BS)"
                            value={bsYear}
                            disabled={pending}
                            onChange={(e) => {
                              const y = Number(e.target.value)
                              setBsYear(y)
                              applyEditBsDate(y, bsMonth, bsDay)
                            }}
                          >
                            {BS_YEAR_RANGE.map((y) => (
                              <option key={y} value={y}>
                                {y} BS
                              </option>
                            ))}
                          </select>
                          <select
                            className="input-field text-sm min-h-[44px] pr-10"
                            aria-label="Payment month (BS)"
                            value={bsMonth}
                            disabled={pending}
                            onChange={(e) => {
                              const m = Number(e.target.value)
                              setBsMonth(m)
                              applyEditBsDate(bsYear, m, bsDay)
                            }}
                          >
                            {BS_MONTHS.map((name, idx) => (
                              <option key={name} value={idx + 1}>
                                {name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="input-field text-sm min-h-[44px] pr-10"
                            aria-label="Payment day (BS)"
                            value={bsDay}
                            disabled={pending}
                            onChange={(e) => {
                              const day = Number(e.target.value)
                              setBsDay(day)
                              applyEditBsDate(bsYear, bsMonth, day)
                            }}
                          >
                            {Array.from({ length: daysInBsMonth }, (_, i) => i + 1).map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-xs text-slate-500">
                          AD: <span className="font-medium text-slate-700 tabular-nums">{formatAdShort(draft.date)}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AdDateSelects
                          idPrefix={`hist-${p.id}`}
                          value={draft.date}
                          minDate={minDate}
                          maxDate={maxDate}
                          disabled={pending}
                          onChange={setPaymentDateIso}
                        />
                        <p className="text-xs text-slate-500">
                          BS: <span className="font-medium text-slate-700">{formatDateBilingual(draft.date)}</span>
                        </p>
                      </div>
                    )}
                    {minBs && maxBs && (
                      <p className="text-[11px] text-slate-400">
                        Allowed: {minBs.day} {BS_MONTHS[minBs.month - 1]} {minBs.year} BS — {maxBs.day}{' '}
                        {BS_MONTHS[maxBs.month - 1]} {maxBs.year} BS
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5" htmlFor={`pay-amt-${p.id}`}>
                        Amount (NPR)
                      </label>
                      <input
                        id={`pay-amt-${p.id}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        className="input-field text-sm w-full min-h-[44px] currency"
                        value={draft.amount}
                        onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                        disabled={pending}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5" htmlFor={`pay-note-${p.id}`}>
                        Note
                      </label>
                      <input
                        id={`pay-note-${p.id}`}
                        type="text"
                        className="input-field text-sm w-full min-h-[44px]"
                        value={draft.note}
                        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                        placeholder="Optional"
                        disabled={pending}
                      />
                    </div>
                  </div>

                  {editError && <p className="text-xs text-red-600">{editError}</p>}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => commitEdit()}
                      disabled={pending}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-3 py-2.5 min-h-[44px] hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={pending}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-3 py-2.5 min-h-[44px] hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm tabular-nums">{formatDateShort(p.date)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        <span className="sr-only">Gregorian: </span>
                        {formatAdShort(p.date)}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-800 currency tabular-nums border border-emerald-100/90 shadow-sm">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                        {formatNPR(p.amount)}
                      </span>
                      {onSaveLoan && (
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            disabled={pending || !!paymentToDelete}
                            aria-label="Edit payment"
                            className="icon-btn hover:bg-slate-100 text-slate-500 hover:text-slate-800 min-h-[36px] min-w-[36px] disabled:opacity-40"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentToDelete(p)}
                            disabled={pending || !!paymentToDelete}
                            aria-label="Delete payment"
                            className="icon-btn hover:bg-red-50 text-slate-400 hover:text-red-600 min-h-[36px] min-w-[36px] disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {p.note && (
                    <p className="text-xs text-slate-600 mt-2 border-t border-slate-100 pt-2 leading-snug break-words">
                      {p.note}
                    </p>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>

    <Sheet
      open={!!paymentToDelete}
      onClose={() => {
        if (!pending) setPaymentToDelete(null)
      }}
      size="sm"
    >
      {({ titleId }) => (
        <>
          <div className="px-6 pt-5 pb-2 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 id={titleId} className="text-lg font-bold text-slate-800">
              Delete this payment?
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              Remove{' '}
              <span className="font-semibold text-slate-700 currency tabular-nums">
                {paymentToDelete ? formatNPR(paymentToDelete.amount) : ''}
              </span>{' '}
              recorded on{' '}
              <span className="font-semibold text-slate-700">
                {paymentToDelete ? formatDateShort(paymentToDelete.date) : ''}
              </span>
              . Outstanding balance and interest will be recalculated.
            </p>
            {paymentToDelete?.note && (
              <p className="text-slate-400 text-xs mt-3 px-1 leading-snug">
                Note: <span className="italic text-slate-500">"{paymentToDelete.note}"</span>
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-5 pt-3 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setPaymentToDelete(null)}
              disabled={pending}
              className="btn-secondary flex-1 min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => performDeletePayment()}
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-xl transition-[transform,colors] duration-220 ease-ios active:scale-[0.97] min-h-[48px] disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete payment
            </button>
          </div>
        </>
      )}
    </Sheet>
    </>
  )
}

const RISK_STYLES = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-orange-600 bg-orange-50',
  low: 'text-green-600 bg-green-50',
}

const RISK_ICON = {
  high: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  medium: <Info className="w-3.5 h-3.5" aria-hidden="true" />,
  low: <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />,
}

// ── Mobile card per loan ──────────────────────────────────────────────────────
function LoanCard({ loan, onEdit, onDelete, onToggle, onRecordPayment, onSaveLoan }) {
  const [expanded, setExpanded] = useState(false)
  const metrics = calculateLoanMetrics(loan)
  const risk = riskLevel(loan)
  const origP = Math.round(parseFloat(loan.principal) || 0)

  return (
    <div className={`border-b border-slate-100 transition-colors ${!loan.isActive ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-sm truncate">{loan.lenderName}</span>
              <span className={TYPE_BADGE[loan.lenderType] || 'badge-person'}>
                {TYPE_LABEL[loan.lenderType] || loan.lenderType}
              </span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${RISK_STYLES[risk]}`}>
                {RISK_ICON[risk]} <span className="capitalize">{risk}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {loan.borrowerName} · {formatDateShort(loan.loanDate)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Hide details' : 'Show details'}
              aria-expanded={expanded}
              className="icon-btn hover:bg-slate-100 text-slate-400"
            >
              {expanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button
              onClick={() => onEdit(loan)}
              aria-label={`Edit loan from ${loan.lenderName}`}
              className="icon-btn hover:bg-blue-50 text-slate-400 hover:text-blue-600"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDelete(loan.id)}
              aria-label={`Delete loan from ${loan.lenderName}`}
              className="icon-btn hover:bg-red-50 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Balance</p>
            <p className="text-sm font-semibold text-slate-800 currency truncate">{formatNPR(metrics.outstandingPrincipal)}</p>
            {origP !== metrics.outstandingPrincipal && (
              <p className="text-[10px] text-slate-400 currency">of {formatNPR(origP)}</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Byaj (owed)</p>
            <p className="text-sm font-semibold text-orange-600 currency truncate">{formatNPR(metrics.interest)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Total due</p>
            <p className="text-sm font-bold text-red-600 currency truncate">{formatNPR(metrics.total)}</p>
          </div>
        </div>
        {loan.isActive && onRecordPayment && (
          <button
            type="button"
            onClick={() => onRecordPayment(loan)}
            className="mt-3 w-full min-h-[44px] rounded-xl bg-nepal-red/10 text-nepal-red font-semibold text-sm
                       border border-nepal-red/20 hover:bg-nepal-red/15 transition-[transform,colors] duration-180 ease-ios active:scale-[0.99]"
          >
            Record payment
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase font-medium">Date</span>
              <p className="font-semibold text-slate-700">{formatDateBilingual(loan.loanDate)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-medium">Rate</span>
              <p className="font-semibold text-slate-700 currency">
                {loan.interestRate}%/{loan.rateType === 'monthly' ? 'mo' : 'yr'}
                <span className="text-slate-400 text-xs"> ({metrics.annualRate.toFixed(1)}% p.a.)</span>
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-medium">Age</span>
              <p className="font-semibold text-slate-700">
                {metrics.monthsElapsed < 24
                  ? `${metrics.monthsElapsed} months`
                  : `${metrics.yearsElapsed.toFixed(1)} years`}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-medium">Daily Interest</span>
              <p className="font-semibold text-slate-700 currency">{formatNPR(metrics.dailyInterest)}/day</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-medium">Type</span>
              <p className="font-semibold text-slate-700 capitalize">
                {loan.interestType}{loan.interestType === 'compound' ? ` (${loan.compoundFrequency})` : ''}
              </p>
            </div>
            <div>
              <button
                onClick={() => onToggle(loan.id)}
                aria-pressed={loan.isActive}
                className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-[transform,colors] duration-180 ease-ios active:scale-[0.97] mt-2 min-h-[40px] ${
                  loan.isActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {loan.isActive ? '● Active — mark paid' : '○ Paid — reactivate'}
              </button>
            </div>
            {loan.notes && (
              <div className="col-span-2">
                <span className="text-xs text-slate-400 uppercase font-medium">Notes</span>
                <p className="text-slate-700 break-words">{loan.notes}</p>
              </div>
            )}
            <PaymentHistoryBlock loan={loan} className="col-span-2" onSaveLoan={onSaveLoan} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sortable column header ────────────────────────────────────────────────────
function SortableHeader({ id, label, sortKey, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === id
  const dirNext = active && sortDir === 'desc' ? 'asc' : 'desc'
  const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 text-left ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(id, dirNext)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
      >
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />)}
      </button>
    </th>
  )
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function LoanRow({ loan, onEdit, onDelete, onToggle, onRecordPayment, onSaveLoan }) {
  const [expanded, setExpanded] = useState(false)
  const metrics = calculateLoanMetrics(loan)
  const risk = riskLevel(loan)
  const origP = Math.round(parseFloat(loan.principal) || 0)

  return (
    <>
      <tr className={`loan-row border-b border-slate-50 transition-colors ${!loan.isActive ? 'opacity-60' : ''}`}>
        <td className="px-4 py-3">
          <div className="font-semibold text-slate-800 text-sm">{loan.lenderName}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={TYPE_BADGE[loan.lenderType] || 'badge-person'}>
              {TYPE_LABEL[loan.lenderType] || loan.lenderType}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${RISK_STYLES[risk]}`}>
              {RISK_ICON[risk]} <span className="capitalize">{risk}</span>
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-slate-700">{loan.borrowerName}</div>
          <div className="text-xs text-slate-400">{formatDateShort(loan.loanDate)}</div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="text-sm font-medium text-slate-700">
            {metrics.monthsElapsed < 24 ? `${metrics.monthsElapsed} mo` : `${metrics.yearsElapsed.toFixed(1)} yr`}
          </div>
          <div className="text-xs text-slate-400">{metrics.daysElapsed} days</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-semibold text-slate-800 currency">{formatNPR(metrics.outstandingPrincipal)}</div>
          {origP !== metrics.outstandingPrincipal && (
            <div className="text-[10px] text-slate-400 currency">of {formatNPR(origP)}</div>
          )}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="font-semibold text-slate-700 text-sm currency">
            {loan.interestRate}%/{loan.rateType === 'monthly' ? 'mo' : 'yr'}
          </span>
          <span className="text-slate-400 text-xs block capitalize">{loan.interestType}</span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="text-sm font-semibold text-orange-600 currency">{formatNPR(metrics.interest)}</div>
          <div className="text-xs text-slate-400 currency">+{metrics.interestPercent}%</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-bold text-red-600 currency">{formatNPR(metrics.total)}</div>
          <div className="text-xs text-slate-400 currency">{formatNPR(metrics.dailyInterest)}/day</div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <button
            onClick={() => onToggle(loan.id)}
            aria-pressed={loan.isActive}
            className={`${loan.isActive ? 'badge-active' : 'badge-paid'} cursor-pointer`}
            title="Click to toggle status"
          >
            {loan.isActive ? '● Active' : '○ Paid'}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-0.5 justify-end sm:justify-start">
            {loan.isActive && onRecordPayment && (
              <button
                type="button"
                onClick={() => onRecordPayment(loan)}
                className="hidden sm:inline-flex text-xs font-semibold text-nepal-red px-2 py-1.5 rounded-lg border border-nepal-red/25
                           bg-nepal-red/5 hover:bg-nepal-red/10 min-h-[40px] mr-1"
              >
                Pay
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Hide loan details' : 'Show loan details'}
              aria-expanded={expanded}
              className="icon-btn hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              {expanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button
              onClick={() => onEdit(loan)}
              aria-label={`Edit loan from ${loan.lenderName}`}
              className="icon-btn hover:bg-blue-50 text-slate-400 hover:text-blue-600"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDelete(loan.id)}
              aria-label={`Delete loan from ${loan.lenderName}`}
              className="icon-btn hover:bg-red-50 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Loan Date (BS)</span>
                <p className="font-semibold text-slate-800">{formatDateBilingual(loan.loanDate)}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Annual Rate</span>
                <p className="font-semibold text-slate-800 currency">{metrics.annualRate.toFixed(2)}% p.a.</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Monthly Rate</span>
                <p className="font-semibold text-slate-800 currency">{metrics.monthlyRate.toFixed(3)}% p.m.</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Daily Interest</span>
                <p className="font-semibold text-slate-800 currency">{formatNPR(metrics.dailyInterest)}/day</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Interest Type</span>
                <p className="font-semibold text-slate-800 capitalize">
                  {loan.interestType}{loan.interestType === 'compound' ? ` (${loan.compoundFrequency})` : ''}
                </p>
              </div>
              {loan.notes && (
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-slate-500 text-xs font-medium uppercase">Notes</span>
                  <p className="text-slate-700">{loan.notes}</p>
                </div>
              )}
              <PaymentHistoryBlock loan={loan} onSaveLoan={onSaveLoan} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main exported component ───────────────────────────────────────────────────
export default function LoanTable({ loans, onEdit, onDelete, onToggle, onAddLoan, onRecordPayment, onSaveLoan }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(id, dir) {
    setSortBy(id)
    setSortDir(dir)
  }

  const filtered = loans
    .filter((l) => {
      if (filter === 'active') return l.isActive
      if (filter === 'paid') return !l.isActive
      return true
    })
    .filter((l) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.lenderName.toLowerCase().includes(q) ||
        l.borrowerName.toLowerCase().includes(q) ||
        l.lenderType.toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const sign = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'principal')
        return sign * (calculateLoanMetrics(a).outstandingPrincipal - calculateLoanMetrics(b).outstandingPrincipal)
      if (sortBy === 'outstanding') return sign * (calculateLoanMetrics(a).total - calculateLoanMetrics(b).total)
      if (sortBy === 'lender')      return sign * a.lenderName.localeCompare(b.lenderName)
      if (sortBy === 'borrower')    return sign * a.borrowerName.localeCompare(b.borrowerName)
      return sign * (new Date(a.loanDate) - new Date(b.loanDate))
    })

  return (
    <div className="card overflow-hidden">
      {/* Toolbar — search full-width on mobile, filter+sort 2-col below */}
      <div className="p-3 sm:p-4 border-b border-slate-100 grid grid-cols-1 sm:flex gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search lender, borrower…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputMode="search"
            enterKeyHint="search"
            aria-label="Search loans"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <select
              className="input-field pl-8 text-sm w-full sm:w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <select
            className="input-field text-sm w-full sm:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
          >
            <option value="date">Date</option>
            <option value="principal">Amount</option>
            <option value="outstanding">Outstanding</option>
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onRecordPayment={onRecordPayment}
                onSaveLoan={onSaveLoan}
              />
            ))}
          </div>

          {/* Desktop: scrollable table with sticky header */}
          <div className="hidden sm:block max-h-[70dvh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-sticky bg-slate-50">
                <tr>
                  <SortableHeader id="lender"      label="Lender"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader id="borrower"    label="Borrower"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-4 py-3 text-left hidden md:table-cell">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</span>
                  </th>
                  <SortableHeader id="principal"   label="Balance"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left hidden sm:table-cell">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interest</span>
                  </th>
                  <SortableHeader id="outstanding" label="Outstanding" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-4 py-3 text-left hidden md:table-cell">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <LoanRow
                    key={loan.id}
                    loan={loan}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onRecordPayment={onRecordPayment}
                    onSaveLoan={onSaveLoan}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="py-16 text-center px-6">
          <p className="text-4xl mb-3" aria-hidden="true">💰</p>
          <p className="text-slate-600 font-semibold">No loans found</p>
          <p className="text-slate-400 text-sm mt-1">
            {loans.length === 0 ? 'Add your first loan to get started' : 'Try adjusting search or filter'}
          </p>
          {loans.length === 0 && (
            <button onClick={onAddLoan} className="btn-primary mx-auto mt-4">
              Add First Loan
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between flex-wrap gap-2">
          <span aria-live="polite">Showing {filtered.length} of {loans.length} loans</span>
          <span className="hidden sm:inline">Click a column header to sort · ▾ for details</span>
        </div>
      )}
    </div>
  )
}
