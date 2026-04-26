import { useState, useEffect, useRef } from 'react'
import {
  X,
  Save,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  Zap,
  ChevronDown,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import Sheet from './Sheet'
import { formatNPR, toLakh } from '../utils/calculations'
import {
  BS_MONTHS, BS_YEAR_RANGE,
  bsToIso, isoToBs, bsMonthDays,
} from '../utils/nepaliDate'

// ── AD date (styled selects; avoids native date picker on small screens) ──────
function pad2(n) {
  return String(Math.max(0, Math.floor(Number(n)))).padStart(2, '0')
}

function adDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function clampLoanAdIso(iso, minDate, maxDate) {
  if (!iso) return minDate
  const s = iso.slice(0, 10)
  if (s < minDate) return minDate
  if (s > maxDate) return maxDate
  return s
}

const AD_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function AdDateTriplet({ value, onChange, minDate, maxDate, idPrefix }) {
  const minParts = minDate.split('-').map(Number)
  const maxParts = maxDate.split('-').map(Number)
  const clamped = clampLoanAdIso((value || minDate).slice(0, 10), minDate, maxDate)
  let [y, m, d] = clamped.split('-').map(Number)

  const years = []
  for (let yy = minParts[0]; yy <= maxParts[0]; yy++) years.push(yy)

  const monthStart = y === minParts[0] ? minParts[1] : 1
  const monthEnd = y === maxParts[0] ? maxParts[1] : 12

  let dayStart = 1
  let dayEnd = adDaysInMonth(y, m)
  if (y === minParts[0] && m === minParts[1]) dayStart = minParts[2]
  if (y === maxParts[0] && m === maxParts[1]) dayEnd = maxParts[2]

  function commit(ny, nm, nd) {
    const dimM = adDaysInMonth(ny, nm)
    let dd = Math.min(dimM, Math.max(1, nd))
    let next = `${ny}-${pad2(nm)}-${pad2(dd)}`
    next = clampLoanAdIso(next, minDate, maxDate)
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
      <select
        id={`${idPrefix}-ad-y`}
        className="input-field text-base min-h-[48px]"
        aria-label="Loan year (AD)"
        value={y}
        onChange={(e) => commit(Number(e.target.value), m, d)}
      >
        {years.map((yy) => (
          <option key={yy} value={yy}>{yy}</option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ad-m`}
        className="input-field text-base min-h-[48px]"
        aria-label="Loan month (AD)"
        value={m}
        onChange={(e) => commit(y, Number(e.target.value), d)}
      >
        {Array.from({ length: monthEnd - monthStart + 1 }, (_, i) => monthStart + i).map((mm) => (
          <option key={mm} value={mm}>{AD_MONTH_SHORT[mm - 1]}</option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ad-d`}
        className="input-field text-base min-h-[48px]"
        aria-label="Loan day (AD)"
        value={d}
        onChange={(e) => commit(y, m, Number(e.target.value))}
      >
        {Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i).map((dd) => (
          <option key={dd} value={dd}>{dd}</option>
        ))}
      </select>
    </div>
  )
}

// ── Lender type definitions ───────────────────────────────────────────────────
const LENDER_TYPES = [
  {
    value: 'person',       emoji: '👤', label: 'व्यक्ति',  sublabel: 'Individual / Sahukar',
    desc: 'Local moneylender, neighbor, or relative',
    rateRange: '2–5% / month', annualRange: '24–60% p.a.',
    interestType: 'simple', nrbCap: null, color: 'purple',
    defaultRate: '2', rateType: 'monthly',
  },
  {
    value: 'cooperative',  emoji: '🤝', label: 'सहकारी',   sublabel: 'Cooperative / Sahakari',
    desc: 'Community savings & credit cooperative',
    rateRange: '1–1.25% / month', annualRange: '12–15% p.a.',
    interestType: 'simple', nrbCap: 14.75, color: 'green',
    defaultRate: '1', rateType: 'monthly',
  },
  {
    value: 'bank',         emoji: '🏦', label: 'बैंक',     sublabel: 'Commercial / Development Bank',
    desc: 'Nepal Bank, Nabil, Everest, Sunrise...',
    rateRange: '0.75–1.2% / month', annualRange: '9–14% p.a.',
    interestType: 'compound', nrbCap: null, color: 'blue',
    defaultRate: '12', rateType: 'annual',
  },
  {
    value: 'microfinance', emoji: '💳', label: 'लघुवित्त',  sublabel: 'Microfinance / Laghubitta',
    desc: 'Nirdhan, RMDC, Chhimek, First MF...',
    rateRange: '~1.1–1.25% / month', annualRange: '13–15% p.a.',
    interestType: 'simple', nrbCap: 15, color: 'orange',
    defaultRate: '1.1', rateType: 'monthly',
  },
]

const CARD_COLORS = {
  purple: { selected: 'border-purple-500 bg-purple-50 ring-2 ring-purple-300', unselected: 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40', badge: 'bg-purple-100 text-purple-700', emoji: 'bg-purple-100' },
  green:  { selected: 'border-green-500 bg-green-50 ring-2 ring-green-300',    unselected: 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50/40',   badge: 'bg-green-100 text-green-700',   emoji: 'bg-green-100' },
  blue:   { selected: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',       unselected: 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',     badge: 'bg-blue-100 text-blue-700',     emoji: 'bg-blue-100' },
  orange: { selected: 'border-orange-500 bg-orange-50 ring-2 ring-orange-300', unselected: 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40', badge: 'bg-orange-100 text-orange-700', emoji: 'bg-orange-100' },
}

const AMOUNT_PRESETS = [
  { label: '50K',  value: 50000   },
  { label: '1L',   value: 100000  },
  { label: '2L',   value: 200000  },
  { label: '5L',   value: 500000  },
  { label: '10L',  value: 1000000 },
  { label: '20L',  value: 2000000 },
]

// ── Rate warning ──────────────────────────────────────────────────────────────
function getRateWarning(lenderType, annualRate) {
  if (!annualRate || isNaN(annualRate) || annualRate <= 0) return null
  if (lenderType === 'cooperative' && annualRate > 14.75)
    return { level: 'error', msg: `Above NRB cap of 14.75% p.a. for cooperatives` }
  if (lenderType === 'microfinance' && annualRate > 15)
    return { level: 'error', msg: `Above NRB cap of 15% p.a. for microfinance (Laghubitta)` }
  if (lenderType === 'bank' && annualRate > 18)
    return { level: 'warn',  msg: `Banks typically charge 9–14% p.a. — double-check this rate` }
  if (annualRate > 60)
    return { level: 'error', msg: `${annualRate.toFixed(1)}% p.a. is "Meter Byaj" territory — illegal under Nepal law` }
  if (annualRate > 36 && lenderType === 'person')
    return { level: 'warn',  msg: `${(annualRate / 12).toFixed(1)}%/month — high but common with Terai sahukars. Over 5%/month is illegal.` }
  return null
}

// ── Bilingual Date Picker ─────────────────────────────────────────────────────
function DatePicker({ value, onChange, error }) {
  const [mode, setMode] = useState('bs')
  const todayIso = new Date().toISOString().split('T')[0]
  const bsCurrent = value ? isoToBs(value) : null
  const defaultBs = bsCurrent || isoToBs(todayIso)
  const [bsYear, setBsYear]   = useState(defaultBs?.year  || 2082)
  const [bsMonth, setBsMonth] = useState(defaultBs?.month || 1)
  const [bsDay, setBsDay]     = useState(defaultBs?.day   || 1)

  useEffect(() => {
    const bs = value ? isoToBs(value) : null
    if (bs) { setBsYear(bs.year); setBsMonth(bs.month); setBsDay(bs.day) }
  }, [value])

  function emitBs(y, m, d) {
    const maxDay = bsMonthDays(y, m)
    const safeDay = Math.min(d, maxDay)
    if (safeDay !== d) setBsDay(safeDay)
    onChange(bsToIso(y, m, safeDay))
  }

  const daysInMonth = bsMonthDays(bsYear, bsMonth)
  const adLabel = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const bsLabel = bsCurrent ? `${bsCurrent.day} ${BS_MONTHS[bsCurrent.month - 1]} ${bsCurrent.year} BS` : null

  const adMin = '1945-01-01'

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <label className="label mb-0">Loan Date *</label>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold shrink-0 self-start sm:self-auto">
          {['bs', 'ad'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-4 py-2.5 min-h-[44px] min-w-[3.5rem] transition-colors duration-180 ${
                mode === m ? 'bg-nepal-red text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {m === 'bs' ? 'BS' : 'AD'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'bs' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
            <select
              className="input-field text-base min-h-[48px]"
              aria-label="Bikram Sambat year"
              value={bsYear}
              onChange={(e) => { const y = Number(e.target.value); setBsYear(y); emitBs(y, bsMonth, bsDay) }}
            >
              {[...BS_YEAR_RANGE].reverse().map((y) => <option key={y} value={y}>{y} BS</option>)}
            </select>
            <select
              className="input-field text-base min-h-[48px]"
              aria-label="Bikram Sambat month"
              value={bsMonth}
              onChange={(e) => { const m = Number(e.target.value); setBsMonth(m); emitBs(bsYear, m, bsDay) }}
            >
              {BS_MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              className="input-field text-base min-h-[48px]"
              aria-label="Bikram Sambat day"
              value={bsDay}
              onChange={(e) => { const d = Number(e.target.value); setBsDay(d); emitBs(bsYear, bsMonth, d) }}
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {adLabel && <p className="text-xs text-slate-500">AD equivalent: <span className="font-medium text-slate-700 tabular-nums">{adLabel}</span></p>}
        </div>
      ) : (
        <div className="space-y-2">
          <AdDateTriplet
            idPrefix="lf-loan"
            value={value || todayIso}
            minDate={adMin}
            maxDate={todayIso}
            onChange={(iso) => {
              onChange(iso)
              const bs = isoToBs(iso)
              if (bs) {
                setBsYear(bs.year)
                setBsMonth(bs.month)
                setBsDay(bs.day)
              }
            }}
          />
          {bsLabel && <p className="text-xs text-slate-500">BS equivalent: <span className="font-medium text-slate-700">{bsLabel}</span></p>}
        </div>
      )}
      {error && <p role="alert" className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
function LivePreview({ principal, annualRate, interestType, compoundFrequency }) {
  const p = parseFloat(principal) || 0
  const r = annualRate / 100
  const monthlyInterest = p * (r / 12)

  function calcOutstanding(years) {
    if (p === 0 || annualRate === 0) return p
    if (interestType === 'simple') return p + p * r * years
    const n = compoundFrequency === 'monthly' ? 12 : compoundFrequency === 'quarterly' ? 4 : 1
    return p * Math.pow(1 + r / n, n * years)
  }

  const after1yr = calcOutstanding(1)
  const after3yr = calcOutstanding(3)
  const dailyCost = (p * r) / 365
  const interestAfter1yr = after1yr - p
  const maxBar = after3yr - p
  const bar1Pct = maxBar > 0 ? Math.min(100, (interestAfter1yr / maxBar) * 100) : 0
  const hasData = p > 0 && annualRate > 0

  return (
    <div className="bg-gradient-to-b from-nepal-blue to-slate-800 text-white rounded-2xl p-5 space-y-4 h-full">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-300" aria-hidden="true" />
        <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wide">Live Preview</h3>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Zap className="w-8 h-8 text-slate-500 mb-2" aria-hidden="true" />
          <p className="text-slate-400 text-sm">Enter amount &amp; rate<br />to see projections</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5">Principal</p>
            <p className="text-xl font-bold currency">{formatNPR(p)}</p>
            <p className="text-xs text-slate-400">{toLakh(p)}</p>
          </div>

          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5">Monthly Interest</p>
            <p className="text-lg font-bold text-yellow-300 currency">{formatNPR(Math.round(monthlyInterest))}</p>
            <p className="text-xs text-slate-400">{annualRate.toFixed(2)}% p.a. · {(annualRate / 12).toFixed(2)}%/mo</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" /> After 1 Yr
              </p>
              <p className="text-sm font-bold text-orange-300 currency">{formatNPR(Math.round(after1yr))}</p>
              <p className="text-xs text-slate-400 currency">+{formatNPR(Math.round(interestAfter1yr))}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" /> After 3 Yrs
              </p>
              <p className="text-sm font-bold text-red-300 currency">{formatNPR(Math.round(after3yr))}</p>
              <p className="text-xs text-slate-400 currency">+{formatNPR(Math.round(after3yr - p))}</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3" aria-hidden="true" /> Daily Cost
            </p>
            <p className="text-base font-bold currency">
              {formatNPR(Math.round(dailyCost))}
              <span className="text-xs font-normal text-slate-400"> / day</span>
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Principal vs Interest (1 yr)</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-400 transition-all duration-700 ease-ios" style={{ width: `${100 - bar1Pct}%` }} />
              <div className="h-full bg-orange-400 transition-all duration-700 ease-ios" style={{ width: `${bar1Pct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-blue-300">Principal</span>
              <span className="text-orange-300">Interest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty form defaults ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  lenderName: '',
  lenderType: 'person',
  borrowerName: '',
  loanDate: new Date().toISOString().split('T')[0],
  principal: '',
  interestRate: '2',
  rateType: 'monthly',
  interestType: 'simple',
  compoundFrequency: 'monthly',
  notes: '',
  isActive: true,
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LoanForm({ loan, onSave, onClose }) {
  const initialForm = loan ? { ...EMPTY_FORM, ...loan } : EMPTY_FORM
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const isEdit = !!loan
  const initialJson = useRef(JSON.stringify(initialForm))

  // Refs for autofocus on validation error
  const refs = {
    lenderName:   useRef(null),
    borrowerName: useRef(null),
    principal:    useRef(null),
    interestRate: useRef(null),
  }

  useEffect(() => {
    if (loan) {
      const next = { ...EMPTY_FORM, ...loan }
      setForm(next)
      initialJson.current = JSON.stringify(next)
    }
  }, [loan])

  const isDirty = JSON.stringify(form) !== initialJson.current

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function selectLenderType(val) {
    const info = LENDER_TYPES.find((t) => t.value === val)
    setForm((prev) => ({
      ...prev,
      lenderType: val,
      interestType: isEdit ? prev.interestType : (info?.interestType || 'simple'),
      rateType:     isEdit ? prev.rateType     : (info?.rateType     || 'monthly'),
      interestRate: isEdit ? prev.interestRate : (info?.defaultRate  || ''),
    }))
    setErrors((prev) => ({ ...prev, interestRate: '' }))
  }

  function validate() {
    const e = {}
    if (!form.lenderName.trim()) e.lenderName = 'Lender name is required'
    if (!form.borrowerName.trim()) e.borrowerName = 'Borrower name is required'
    if (!form.loanDate) e.loanDate = 'Loan date is required'
    const p = parseFloat(form.principal)
    if (!form.principal || isNaN(p) || p <= 0) e.principal = 'Enter a valid principal amount'
    const r = parseFloat(form.interestRate)
    if (!form.interestRate || isNaN(r) || r < 0) e.interestRate = 'Enter a valid interest rate'
    if (form.loanDate && new Date(form.loanDate) > new Date()) e.loanDate = 'Loan date cannot be in the future'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstKey = ['lenderName', 'borrowerName', 'principal', 'interestRate'].find((k) => errs[k])
      if (firstKey && refs[firstKey]?.current) refs[firstKey].current.focus()
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        ...form,
        id: loan?.id || uuidv4(),
        principal: String(form.principal).replace(/,/g, ''),
        interestRate: String(form.interestRate),
        ...(loan?.payments?.length ? { payments: loan.payments } : {}),
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  function tryClose() {
    if (!isDirty || confirmDiscard) {
      onClose()
      return false // already closed; Sheet will not call onClose again
    }
    setConfirmDiscard(true)
    return false
  }

  const rawRate = parseFloat(form.interestRate) || 0
  const annualRate = form.rateType === 'monthly' ? rawRate * 12 : rawRate
  const rateWarning = form.interestRate ? getRateWarning(form.lenderType, annualRate) : null
  const selectedType = LENDER_TYPES.find((t) => t.value === form.lenderType)

  const notesPlaceholder = {
    person: 'Purpose, collateral (land/gold?), verbal agreement...',
    cooperative: 'Loan purpose, group guarantee, kista plan...',
    microfinance: 'Group (samuh) name, field officer, kista amount...',
    bank: 'Account number, EMI amount, loan officer name...',
  }[form.lenderType]

  return (
    <Sheet
      open={true}
      onClose={onClose}
      onTryClose={() => {
        if (!isDirty) return true
        setConfirmDiscard(true)
        return false
      }}
      size="4xl"
      labelledBy="loan-form-title"
      className="max-w-4xl"
    >
      {() => (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
            <div className="min-w-0 pr-2">
              <h2 id="loan-form-title" className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                {isEdit ? 'Edit Loan' : 'Add New Loan'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-snug">
                {isEdit ? 'Update loan details' : 'Record a new loan in your tracker'}
              </p>
            </div>
            <button
              type="button"
              onClick={tryClose}
              aria-label="Close form"
              className="icon-btn shrink-0 hover:bg-slate-100 text-slate-500 min-h-[44px] min-w-[44px]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Discard-changes banner */}
          {confirmDiscard && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm"
            >
              <span className="font-medium">Discard unsaved changes?</span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="px-3 py-1.5 rounded-lg text-amber-800 hover:bg-amber-100 font-semibold text-xs min-h-[36px]"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs min-h-[36px]"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">
              {/* ── Left: Form ── */}
              <form id="loan-form" onSubmit={handleSubmit} className="flex-1 p-4 sm:p-5 space-y-4 sm:space-y-5 min-w-0">

                {/* Lender type cards */}
                <div>
                  <label className="label">Lender Type *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {LENDER_TYPES.map((t) => {
                      const c = CARD_COLORS[t.color]
                      const isSelected = form.lenderType === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => selectLenderType(t.value)}
                          aria-pressed={isSelected}
                          className={`border-2 rounded-xl p-2.5 sm:p-3 text-left transition-[transform,colors,box-shadow] duration-180 ease-ios active:scale-[0.98] min-h-[96px] sm:min-h-[112px] ${isSelected ? c.selected : c.unselected}`}
                        >
                          <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-lg mb-1.5 sm:mb-2 ${c.emoji}`} aria-hidden="true">
                            {t.emoji}
                          </div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{t.label}</p>
                          <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">{t.sublabel}</p>
                          <span className={`inline-block text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1 sm:mt-1.5 ${c.badge}`}>
                            {t.rateRange}
                          </span>
                          {t.nrbCap && (
                            <p className="text-[10px] sm:text-xs text-green-600 mt-0.5">NRB cap: {t.nrbCap}%</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {selectedType && (
                    <p className="text-xs text-slate-500 mt-2 pl-1">
                      {selectedType.desc} · {selectedType.annualRange}
                    </p>
                  )}
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="lf-lender" className="label">Lender Name *</label>
                    <input
                      id="lf-lender"
                      ref={refs.lenderName}
                      className="input-field text-base sm:text-sm"
                      placeholder="e.g. Ram Sahukar, Shree Sahakari"
                      value={form.lenderName}
                      onChange={(e) => set('lenderName', e.target.value)}
                      autoComplete="name"
                      enterKeyHint="next"
                      aria-invalid={!!errors.lenderName}
                      aria-describedby={errors.lenderName ? 'lf-lender-err' : undefined}
                    />
                    {errors.lenderName && (
                      <p id="lf-lender-err" role="alert" className="text-red-500 text-xs mt-1">
                        {errors.lenderName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="lf-borrower" className="label">Borrower Name *</label>
                    <input
                      id="lf-borrower"
                      ref={refs.borrowerName}
                      className="input-field text-base sm:text-sm"
                      placeholder="Family member who took the loan"
                      value={form.borrowerName}
                      onChange={(e) => set('borrowerName', e.target.value)}
                      autoComplete="name"
                      enterKeyHint="next"
                      aria-invalid={!!errors.borrowerName}
                      aria-describedby={errors.borrowerName ? 'lf-borrower-err' : undefined}
                    />
                    {errors.borrowerName && (
                      <p id="lf-borrower-err" role="alert" className="text-red-500 text-xs mt-1">
                        {errors.borrowerName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Principal + presets */}
                <div>
                  <label htmlFor="lf-principal" className="label">Principal Amount (NPR) *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                    {AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => set('principal', String(preset.value))}
                        aria-pressed={String(form.principal) === String(preset.value)}
                        className={`rounded-xl text-sm font-semibold border transition-all duration-180 ease-ios min-h-[48px] px-2 sm:px-2 sm:min-h-[46px] active:scale-[0.97] touch-manipulation ${
                          String(form.principal) === String(preset.value)
                            ? 'bg-nepal-red text-white border-nepal-red shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-nepal-red/50 hover:bg-red-50/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-base" aria-hidden="true">₨</span>
                    <input
                      id="lf-principal"
                      ref={refs.principal}
                      className="input-field pl-8 sm:pl-7 currency text-base sm:text-sm min-h-[48px]"
                      placeholder="e.g. 200000"
                      value={form.principal}
                      onChange={(e) => set('principal', e.target.value)}
                      inputMode="numeric"
                      enterKeyHint="next"
                      aria-invalid={!!errors.principal}
                      aria-describedby={errors.principal ? 'lf-principal-err' : undefined}
                    />
                  </div>
                  {errors.principal && (
                    <p id="lf-principal-err" role="alert" className="text-red-500 text-xs mt-1">
                      {errors.principal}
                    </p>
                  )}
                  {form.principal && !errors.principal && parseFloat(form.principal) > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{toLakh(parseFloat(form.principal))}</p>
                  )}
                </div>

                {/* Interest rate */}
                <div>
                  <label htmlFor="lf-rate" className="label">Interest Rate *</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="relative flex-1 min-w-0">
                      <input
                        id="lf-rate"
                        ref={refs.interestRate}
                        className="input-field pr-7 currency text-base sm:text-sm min-h-[48px]"
                        placeholder={form.rateType === 'monthly' ? 'e.g. 2' : 'e.g. 18'}
                        value={form.interestRate}
                        onChange={(e) => set('interestRate', e.target.value)}
                        inputMode="decimal"
                        enterKeyHint="next"
                        aria-invalid={!!errors.interestRate}
                        aria-describedby={errors.interestRate ? 'lf-rate-err' : undefined}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">%</span>
                    </div>
                    <select
                      className="input-field w-full sm:w-40 shrink-0 text-base sm:text-sm min-h-[48px]"
                      aria-label="Rate period"
                      value={form.rateType}
                      onChange={(e) => set('rateType', e.target.value)}
                    >
                      <option value="monthly">Per month</option>
                      <option value="annual">Per year</option>
                    </select>
                  </div>
                  {rawRate > 0 && (
                    <p className="text-xs text-slate-500 mt-1 currency">
                      = {annualRate.toFixed(2)}% p.a. · {(annualRate / 12).toFixed(3)}%/month
                    </p>
                  )}
                  {errors.interestRate && (
                    <p id="lf-rate-err" role="alert" className="text-red-500 text-xs mt-1">
                      {errors.interestRate}
                    </p>
                  )}
                  {rateWarning && (
                    <div className={`mt-2 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                      rateWarning.level === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{rateWarning.msg}</span>
                    </div>
                  )}
                </div>

                {/* Interest type toggle */}
                <div>
                  <label className="label">
                    Interest Type
                    <span className="ml-1 text-slate-400 font-normal text-xs">(ब्याज प्रकार)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { key: 'simple',   en: 'Simple',   np: 'साधारण',     icon: '📐', desc: 'On principal only' },
                      { key: 'compound', en: 'Compound', np: 'चक्रवृद्धि', icon: '📈', desc: 'Byaj ma Byaj' },
                    ].map(({ key, en, np, icon, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set('interestType', key)}
                        aria-pressed={form.interestType === key}
                        className={`flex items-center gap-2.5 sm:flex-col sm:items-stretch sm:gap-0 rounded-xl border-2 text-left transition-[transform,colors,box-shadow] duration-180 ease-ios active:scale-[0.98] py-2.5 px-3 sm:py-3 sm:px-4 min-h-[72px] sm:min-h-[118px] touch-manipulation ${
                          form.interestType === key
                            ? 'bg-nepal-red text-white border-nepal-red shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-nepal-red'
                        }`}
                      >
                        <span className="text-2xl leading-none shrink-0 sm:text-xl sm:mb-1" aria-hidden="true">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm leading-tight">{en}</p>
                          <p className={`text-xs font-medium leading-tight mt-0.5 ${form.interestType === key ? 'text-red-200' : 'text-slate-500'}`}>{np}</p>
                          <p className={`text-[11px] sm:text-xs mt-0.5 leading-snug ${form.interestType === key ? 'text-red-100' : 'text-slate-400'}`}>{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {form.interestType === 'compound' && (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="lf-cf" className="label">Compounded Every</label>
                      <select
                        id="lf-cf"
                        className="input-field text-base sm:text-sm min-h-[48px]"
                        value={form.compoundFrequency}
                        onChange={(e) => set('compoundFrequency', e.target.value)}
                      >
                        <option value="monthly">Monthly — महिनावारी (12×/year)</option>
                        <option value="quarterly">Quarterly — त्रैमासिक (4×/year)</option>
                        <option value="annually">Annually — वार्षिक (1×/year)</option>
                      </select>
                      {form.lenderType === 'person' && (
                        <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                          Compound interest from a sahukar is "Meter Byaj" — exploitative and illegal if excessive.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date picker */}
                <DatePicker
                  value={form.loanDate}
                  onChange={(iso) => set('loanDate', iso)}
                  error={errors.loanDate}
                />

                {/* Notes + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="lf-notes" className="label">Notes</label>
                    <textarea
                      id="lf-notes"
                      className="input-field resize-none text-base sm:text-sm min-h-[120px]"
                      rows={3}
                      placeholder={notesPlaceholder}
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      enterKeyHint="done"
                    />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <div className="flex gap-2 mt-1">
                      {[
                        { val: true,  icon: '✅', label: 'Active',      np: 'बाँकी छ',    on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-slate-600 border-slate-200 hover:border-green-600' },
                        { val: false, icon: '🏁', label: 'Paid/Closed', np: 'चुक्ता भयो', on: 'bg-slate-500 text-white border-slate-500',   off: 'bg-white text-slate-600 border-slate-200 hover:border-slate-500' },
                      ].map(({ val, icon, label, np, on, off }) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => set('isActive', val)}
                          aria-pressed={form.isActive === val}
                          className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium border transition-[transform,colors] duration-180 ease-ios active:scale-[0.97] min-h-[52px] touch-manipulation ${form.isActive === val ? on : off}`}
                        >
                          <span aria-hidden="true">{icon}</span> {label}
                          <span className="block text-xs opacity-80">{np}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </form>

              {/* ── Right: Live Preview (desktop only) ── */}
              <div className="hidden lg:block w-72 shrink-0 p-4 bg-slate-50 border-l border-slate-100">
                <LivePreview
                  principal={form.principal}
                  annualRate={annualRate}
                  interestType={form.interestType}
                  compoundFrequency={form.compoundFrequency}
                />
              </div>
            </div>

            {/* Mobile: collapsible preview */}
            <details className="lg:hidden mx-4 mb-4 group">
              <summary className="list-none cursor-pointer flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm touch-manipulation">
                <span>Show live projection</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-220 ease-ios group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-3">
                <LivePreview
                  principal={form.principal}
                  annualRate={annualRate}
                  interestType={form.interestType}
                  compoundFrequency={form.compoundFrequency}
                />
              </div>
            </details>
          </div>

          {/* Sticky action bar */}
          <div className="shrink-0 flex gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={tryClose}
              className="btn-secondary flex-1 min-h-[52px] text-base font-semibold touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="loan-form"
              disabled={submitting}
              className="btn-primary flex-1 min-h-[52px] text-base font-semibold touch-manipulation"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>{isEdit ? 'Save Changes' : 'Add Loan'}</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
