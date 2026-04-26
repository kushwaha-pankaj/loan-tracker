import { useState, useEffect } from 'react'
import { X, Save, AlertTriangle, TrendingUp, Calendar, DollarSign, Zap } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { formatNPR, toLakh } from '../utils/calculations'
import {
  BS_MONTHS, BS_MONTHS_NP, BS_YEAR_RANGE,
  bsToIso, isoToBs, bsMonthDays,
} from '../utils/nepaliDate'

// ── Lender type definitions ───────────────────────────────────────────────────
const LENDER_TYPES = [
  {
    value: 'person',
    emoji: '👤',
    label: 'व्यक्ति',
    sublabel: 'Individual / Sahukar',
    desc: 'Local moneylender, neighbor, or relative',
    rateRange: '2–5% / month',
    annualRange: '24–60% p.a.',
    interestType: 'simple',
    nrbCap: null,
    color: 'purple',
    defaultRate: '2',
    rateType: 'monthly',
  },
  {
    value: 'cooperative',
    emoji: '🤝',
    label: 'सहकारी',
    sublabel: 'Cooperative / Sahakari',
    desc: 'Community savings & credit cooperative',
    rateRange: '1–1.25% / month',
    annualRange: '12–15% p.a.',
    interestType: 'simple',
    nrbCap: 14.75,
    color: 'green',
    defaultRate: '1',
    rateType: 'monthly',
  },
  {
    value: 'bank',
    emoji: '🏦',
    label: 'बैंक',
    sublabel: 'Commercial / Development Bank',
    desc: 'Nepal Bank, Nabil, Everest, Sunrise...',
    rateRange: '0.75–1.2% / month',
    annualRange: '9–14% p.a.',
    interestType: 'compound',
    nrbCap: null,
    color: 'blue',
    defaultRate: '12',
    rateType: 'annual',
  },
  {
    value: 'microfinance',
    emoji: '💳',
    label: 'लघुवित्त',
    sublabel: 'Microfinance / Laghubitta',
    desc: 'Nirdhan, RMDC, Chhimek, First MF...',
    rateRange: '~1.1–1.25% / month',
    annualRange: '13–15% p.a.',
    interestType: 'simple',
    nrbCap: 15,
    color: 'orange',
    defaultRate: '1.1',
    rateType: 'monthly',
  },
]

const CARD_COLORS = {
  purple: {
    selected: 'border-purple-500 bg-purple-50 ring-2 ring-purple-300',
    unselected: 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40',
    badge: 'bg-purple-100 text-purple-700',
    emoji: 'bg-purple-100',
  },
  green: {
    selected: 'border-green-500 bg-green-50 ring-2 ring-green-300',
    unselected: 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50/40',
    badge: 'bg-green-100 text-green-700',
    emoji: 'bg-green-100',
  },
  blue: {
    selected: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',
    unselected: 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',
    badge: 'bg-blue-100 text-blue-700',
    emoji: 'bg-blue-100',
  },
  orange: {
    selected: 'border-orange-500 bg-orange-50 ring-2 ring-orange-300',
    unselected: 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40',
    badge: 'bg-orange-100 text-orange-700',
    emoji: 'bg-orange-100',
  },
}

const AMOUNT_PRESETS = [
  { label: '50K', value: 50000 },
  { label: '1L', value: 100000 },
  { label: '2L', value: 200000 },
  { label: '5L', value: 500000 },
  { label: '10L', value: 1000000 },
  { label: '20L', value: 2000000 },
]

// ── Rate warning ──────────────────────────────────────────────────────────────
function getRateWarning(lenderType, annualRate) {
  if (!annualRate || isNaN(annualRate) || annualRate <= 0) return null
  if (lenderType === 'cooperative' && annualRate > 14.75)
    return { level: 'error', msg: `Above NRB cap of 14.75% p.a. for cooperatives` }
  if (lenderType === 'microfinance' && annualRate > 15)
    return { level: 'error', msg: `Above NRB cap of 15% p.a. for microfinance (Laghubitta)` }
  if (lenderType === 'bank' && annualRate > 18)
    return { level: 'warn', msg: `Banks typically charge 9–14% p.a. — double-check this rate` }
  if (annualRate > 60)
    return { level: 'error', msg: `${annualRate.toFixed(1)}% p.a. is "Meter Byaj" territory — illegal under Nepal law` }
  if (annualRate > 36 && lenderType === 'person')
    return { level: 'warn', msg: `${(annualRate / 12).toFixed(1)}%/month — high but common with Terai sahukars. Over 5%/month is illegal.` }
  return null
}

// ── Bilingual Date Picker ─────────────────────────────────────────────────────
function DatePicker({ value, onChange, error }) {
  const [mode, setMode] = useState('bs')
  const todayIso = new Date().toISOString().split('T')[0]
  const bsCurrent = value ? isoToBs(value) : null
  const defaultBs = bsCurrent || isoToBs(todayIso)
  const [bsYear, setBsYear] = useState(defaultBs?.year || 2082)
  const [bsMonth, setBsMonth] = useState(defaultBs?.month || 1)
  const [bsDay, setBsDay] = useState(defaultBs?.day || 1)

  // Re-sync BS dropdowns whenever the external value changes (e.g. editing a
  // different loan or switching from AD to BS mode).
  useEffect(() => {
    const bs = value ? isoToBs(value) : null
    if (bs) {
      setBsYear(bs.year)
      setBsMonth(bs.month)
      setBsDay(bs.day)
    }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">Loan Date *</label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          {['bs', 'ad'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1 transition-colors ${
                mode === m ? 'bg-nepal-red text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {m === 'bs' ? 'BS (नेपाली)' : 'AD (English)'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'bs' ? (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <select
              className="input-field flex-1"
              value={bsYear}
              onChange={(e) => { const y = Number(e.target.value); setBsYear(y); emitBs(y, bsMonth, bsDay) }}
            >
              {[...BS_YEAR_RANGE].reverse().map((y) => <option key={y} value={y}>{y} BS</option>)}
            </select>
            <select
              className="input-field flex-1"
              value={bsMonth}
              onChange={(e) => { const m = Number(e.target.value); setBsMonth(m); emitBs(bsYear, m, bsDay) }}
            >
              {BS_MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name} ({BS_MONTHS_NP[i]})</option>
              ))}
            </select>
            <select
              className="input-field w-20"
              value={bsDay}
              onChange={(e) => { const d = Number(e.target.value); setBsDay(d); emitBs(bsYear, bsMonth, d) }}
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {adLabel && <p className="text-xs text-slate-400">≡ {adLabel} (AD)</p>}
        </div>
      ) : (
        <div className="space-y-1.5">
          <input
            type="date"
            className="input-field"
            value={value || ''}
            max={todayIso}
            onChange={(e) => {
              onChange(e.target.value)
              if (e.target.value) {
                const bs = isoToBs(e.target.value)
                if (bs) { setBsYear(bs.year); setBsMonth(bs.month); setBsDay(bs.day) }
              }
            }}
          />
          {bsLabel && <p className="text-xs text-slate-400">≡ {bsLabel}</p>}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
        <TrendingUp className="w-4 h-4 text-blue-300" />
        <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wide">Live Preview</h3>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Zap className="w-8 h-8 text-slate-500 mb-2" />
          <p className="text-slate-400 text-sm">Enter amount & rate<br />to see projections</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5">Principal</p>
            <p className="text-xl font-bold">{formatNPR(p)}</p>
            <p className="text-xs text-slate-400">{toLakh(p)}</p>
          </div>

          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5">Monthly Interest</p>
            <p className="text-lg font-bold text-yellow-300">{formatNPR(Math.round(monthlyInterest))}</p>
            <p className="text-xs text-slate-400">{annualRate.toFixed(2)}% p.a. · {(annualRate / 12).toFixed(2)}%/mo</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> After 1 Yr
              </p>
              <p className="text-sm font-bold text-orange-300">{formatNPR(Math.round(after1yr))}</p>
              <p className="text-xs text-slate-400">+{formatNPR(Math.round(interestAfter1yr))}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> After 3 Yrs
              </p>
              <p className="text-sm font-bold text-red-300">{formatNPR(Math.round(after3yr))}</p>
              <p className="text-xs text-slate-400">+{formatNPR(Math.round(after3yr - p))}</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-blue-300 mb-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Daily Cost
            </p>
            <p className="text-base font-bold">
              {formatNPR(Math.round(dailyCost))}
              <span className="text-xs font-normal text-slate-400"> / day</span>
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Principal vs Interest (1 yr)</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${100 - bar1Pct}%` }} />
              <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${bar1Pct}%` }} />
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
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const isEdit = !!loan

  useEffect(() => {
    if (loan) setForm({ ...EMPTY_FORM, ...loan })
  }, [loan])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function selectLenderType(val) {
    const info = LENDER_TYPES.find((t) => t.value === val)
    setForm((prev) => ({
      ...prev,
      lenderType: val,
      // Preserve user's existing interest model when editing — only seed
      // defaults on a fresh "Add Loan" flow.
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

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      ...form,
      id: loan?.id || uuidv4(),
      principal: String(form.principal).replace(/,/g, ''),
      interestRate: String(form.interestRate),
    })
    onClose()
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Loan' : 'Add New Loan'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isEdit ? 'Update loan details' : 'Record a new loan in your tracker'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row">

            {/* ── Left: Form ── */}
            <form id="loan-form" onSubmit={handleSubmit} className="flex-1 p-5 space-y-5 min-w-0">

              {/* Lender type cards */}
              <div>
                <label className="label">Lender Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LENDER_TYPES.map((t) => {
                    const c = CARD_COLORS[t.color]
                    const isSelected = form.lenderType === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => selectLenderType(t.value)}
                        className={`border-2 rounded-xl p-3 text-left transition-all duration-150 ${isSelected ? c.selected : c.unselected}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2 ${c.emoji}`}>
                          {t.emoji}
                        </div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{t.label}</p>
                        <p className="text-xs text-slate-500 leading-tight mt-0.5">{t.sublabel}</p>
                        <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1.5 ${c.badge}`}>
                          {t.rateRange}
                        </span>
                        {t.nrbCap && (
                          <p className="text-xs text-green-600 mt-0.5">NRB cap: {t.nrbCap}%</p>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedType && (
                  <p className="text-xs text-slate-500 mt-2 pl-1">{selectedType.desc} · {selectedType.annualRange}</p>
                )}
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Lender Name *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Ram Sahukar, Shree Sahakari"
                    value={form.lenderName}
                    onChange={(e) => set('lenderName', e.target.value)}
                  />
                  {errors.lenderName && <p className="text-red-500 text-xs mt-1">{errors.lenderName}</p>}
                </div>
                <div>
                  <label className="label">Borrower Name *</label>
                  <input
                    className="input-field"
                    placeholder="Family member who took the loan"
                    value={form.borrowerName}
                    onChange={(e) => set('borrowerName', e.target.value)}
                  />
                  {errors.borrowerName && <p className="text-red-500 text-xs mt-1">{errors.borrowerName}</p>}
                </div>
              </div>

              {/* Principal + presets */}
              <div>
                <label className="label">Principal Amount (NPR) *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => set('principal', String(preset.value))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        String(form.principal) === String(preset.value)
                          ? 'bg-nepal-red text-white border-nepal-red'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-nepal-red hover:text-nepal-red'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₨</span>
                  <input
                    className="input-field pl-7"
                    placeholder="e.g. 200000"
                    value={form.principal}
                    onChange={(e) => set('principal', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
                {form.principal && !errors.principal && parseFloat(form.principal) > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{toLakh(parseFloat(form.principal))}</p>
                )}
              </div>

              {/* Interest rate */}
              <div>
                <label className="label">Interest Rate *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="input-field pr-7"
                      placeholder={form.rateType === 'monthly' ? 'e.g. 2' : 'e.g. 18'}
                      value={form.interestRate}
                      onChange={(e) => set('interestRate', e.target.value)}
                      inputMode="decimal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  <select
                    className="input-field w-auto"
                    value={form.rateType}
                    onChange={(e) => set('rateType', e.target.value)}
                  >
                    <option value="monthly">/ Month</option>
                    <option value="annual">/ Year</option>
                  </select>
                </div>
                {rawRate > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    = {annualRate.toFixed(2)}% p.a. · {(annualRate / 12).toFixed(3)}%/month
                  </p>
                )}
                {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
                {rateWarning && (
                  <div className={`mt-2 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                    rateWarning.level === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'simple', en: 'Simple', np: 'साधारण', icon: '📐', desc: 'On principal only' },
                    { key: 'compound', en: 'Compound', np: 'चक्रवृद्धि', icon: '📈', desc: 'Byaj ma Byaj' },
                  ].map(({ key, en, np, icon, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('interestType', key)}
                      className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${
                        form.interestType === key
                          ? 'bg-nepal-red text-white border-nepal-red shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-nepal-red'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <p className="font-bold text-sm mt-1">{en}</p>
                      <p className={`text-sm font-medium ${form.interestType === key ? 'text-red-200' : 'text-slate-500'}`}>{np}</p>
                      <p className={`text-xs mt-0.5 ${form.interestType === key ? 'text-red-100' : 'text-slate-400'}`}>{desc}</p>
                    </button>
                  ))}
                </div>
                {form.interestType === 'compound' && (
                  <div className="mt-3 space-y-2">
                    <label className="label">Compounded Every</label>
                    <select
                      className="input-field"
                      value={form.compoundFrequency}
                      onChange={(e) => set('compoundFrequency', e.target.value)}
                    >
                      <option value="monthly">Monthly — महिनावारी (12×/year)</option>
                      <option value="quarterly">Quarterly — त्रैमासिक (4×/year)</option>
                      <option value="annually">Annually — वार्षिक (1×/year)</option>
                    </select>
                    {form.lenderType === 'person' && (
                      <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder={notesPlaceholder}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { val: true, icon: '✅', label: 'Active', np: 'बाँकी छ', on: 'bg-green-600 text-white border-green-600', off: 'bg-white text-slate-600 border-slate-200 hover:border-green-600' },
                      { val: false, icon: '🏁', label: 'Paid/Closed', np: 'चुक्ता भयो', on: 'bg-slate-500 text-white border-slate-500', off: 'bg-white text-slate-600 border-slate-200 hover:border-slate-500' },
                    ].map(({ val, icon, label, np, on, off }) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => set('isActive', val)}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${form.isActive === val ? on : off}`}
                      >
                        {icon} {label}
                        <span className="block text-xs opacity-80">{np}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            {/* ── Right: Live Preview (desktop) ── */}
            <div className="hidden lg:block w-72 shrink-0 p-4 bg-slate-50 border-l border-slate-100">
              <LivePreview
                principal={form.principal}
                annualRate={annualRate}
                interestType={form.interestType}
                compoundFrequency={form.compoundFrequency}
              />
            </div>
          </div>

          {/* Mobile: preview below form */}
          <div className="lg:hidden mx-5 mb-4">
            <LivePreview
              principal={form.principal}
              annualRate={annualRate}
              interestType={form.interestType}
              compoundFrequency={form.compoundFrequency}
            />
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" form="loan-form" className="btn-primary flex-1 justify-center">
            <Save className="w-4 h-4" />
            {isEdit ? 'Save Changes' : 'Add Loan'}
          </button>
        </div>
      </div>
    </div>
  )
}
