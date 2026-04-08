import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import {
  BS_MONTHS, BS_MONTHS_NP, BS_YEAR_RANGE,
  bsToIso, isoToBs, bsMonthDays,
} from '../utils/nepaliDate'

// ── Real Nepal interest rate data (NRB + field research 2024/25) ──────────────
const LENDER_TYPES = [
  {
    value: 'person',
    label: '👤 व्यक्ति (Individual / Sahukar)',
    desc: 'Local moneylender, neighbor, or relative',
    typicalRate: { min: 24, max: 60, unit: 'annual' },
    commonQuote: 'Usually quoted as 2–5% per month (24–60% per year)',
    interestType: 'simple',
    warning: null,
    nrbCap: null,
  },
  {
    value: 'cooperative',
    label: '🤝 सहकारी (Cooperative / Sahakari)',
    desc: 'Community savings & credit cooperative',
    typicalRate: { min: 12, max: 15, unit: 'annual' },
    commonQuote: 'NRB cap: 14.75% per year · Most charge 12–15% p.a.',
    interestType: 'simple',
    warning: null,
    nrbCap: 14.75,
  },
  {
    value: 'bank',
    label: '🏦 बैंक (Commercial / Development Bank)',
    desc: 'Nepal Bank, Nabil, Everest, Sunrise, etc.',
    typicalRate: { min: 9, max: 14, unit: 'annual' },
    commonQuote: 'Base rate ~6–8% + spread · Effective: 9–14% p.a. reducing balance',
    interestType: 'compound',
    warning: null,
    nrbCap: null,
  },
  {
    value: 'microfinance',
    label: '💳 लघुवित्त (Microfinance / Laghubitta)',
    desc: 'Nirdhan, RMDC, Chhimek, First Microfinance, etc.',
    typicalRate: { min: 13, max: 15, unit: 'annual' },
    commonQuote: 'NRB cap: 15% per year · Service fee max 1.3% extra',
    interestType: 'simple',
    warning: null,
    nrbCap: 15,
  },
]

// Rate warning thresholds based on NRB data and Terai practice
function getRateWarning(lenderType, annualRate) {
  if (!annualRate || isNaN(annualRate)) return null

  const type = LENDER_TYPES.find((t) => t.value === lenderType)

  if (lenderType === 'cooperative' && annualRate > 14.75) {
    return {
      level: 'error',
      msg: `Above NRB cap of 14.75% p.a. for cooperatives — verify with your sahakari`,
    }
  }
  if (lenderType === 'microfinance' && annualRate > 15) {
    return {
      level: 'error',
      msg: `Above NRB cap of 15% p.a. for microfinance (Laghubitta) institutions`,
    }
  }
  if (lenderType === 'bank' && annualRate > 18) {
    return {
      level: 'warn',
      msg: `Banks in Nepal typically charge 9–14% p.a. — double-check this rate`,
    }
  }
  if (annualRate > 60) {
    return {
      level: 'error',
      msg: `${annualRate}% p.a. is extremely high. "Meter Byaj" (meter interest) is illegal under Nepal law. Confirm this is correct.`,
    }
  }
  if (annualRate > 36 && lenderType === 'person') {
    return {
      level: 'warn',
      msg: `${annualRate}% p.a. (${(annualRate / 12).toFixed(1)}%/month) — high but common with informal sahukars in Terai. Meter byaj over 5%/month is illegal.`,
    }
  }
  return null
}

const EMPTY_FORM = {
  lenderName: '',
  lenderType: 'person',
  borrowerName: '',
  loanDate: new Date().toISOString().split('T')[0],
  principal: '',
  interestRate: '',
  rateType: 'annual',
  interestType: 'simple',
  compoundFrequency: 'monthly',
  notes: '',
  isActive: true,
}

// ── Rate reference table shown inside form ────────────────────────────────────
function RateReference({ activeType }) {
  const [open, setOpen] = useState(false)
  const rows = [
    {
      type: 'person',
      label: 'Sahukar / व्यक्ति',
      rate: '2–5% / month',
      annual: '24–60% p.a.',
      method: 'Simple (flat)',
      cap: 'No NRB cap',
      capColor: 'text-red-500',
    },
    {
      type: 'cooperative',
      label: 'Sahakari / सहकारी',
      rate: '1–1.25% / month',
      annual: '12–15% p.a.',
      method: 'Simple',
      cap: 'Max 14.75% NRB',
      capColor: 'text-green-600',
    },
    {
      type: 'microfinance',
      label: 'Laghubitta / लघुवित्त',
      rate: '~1.1–1.25% / month',
      annual: '13–15% p.a.',
      method: 'Flat / simple',
      cap: 'Max 15% NRB',
      capColor: 'text-green-600',
    },
    {
      type: 'bank',
      label: 'Bank / बैंक',
      rate: '0.75–1.2% / month',
      annual: '9–14% p.a.',
      method: 'Reducing balance',
      cap: 'Base rate + spread',
      capColor: 'text-blue-600',
    },
  ]

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          Nepal / Terai Interest Rate Reference (NRB 2024/25)
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">Source</th>
                <th className="px-3 py-2 text-left font-semibold">Typical Rate</th>
                <th className="px-3 py-2 text-left font-semibold">Per Year</th>
                <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Method</th>
                <th className="px-3 py-2 text-left font-semibold">NRB Limit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.type}
                  className={`border-t border-slate-100 ${activeType === row.type ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {activeType === row.type && <span className="mr-1">▶</span>}
                    {row.label}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.rate}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.annual}</td>
                  <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{row.method}</td>
                  <td className={`px-3 py-2 font-semibold ${row.capColor}`}>{row.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>⚠️ Meter Byaj (मिटर ब्याज):</strong> Compound interest charged daily/weekly by informal lenders is illegal under Nepal law. Rates above 5%/month are considered exploitative. If you are paying this, you may have legal recourse.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lender type info card ─────────────────────────────────────────────────────
function LenderHint({ lenderType }) {
  const info = LENDER_TYPES.find((t) => t.value === lenderType)
  if (!info) return null
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800 mt-2">
      <span className="font-semibold">{info.desc}</span>
      <span className="mx-1.5 text-blue-300">·</span>
      {info.commonQuote}
    </div>
  )
}

// ── Bilingual Date Picker (AD / BS) ──────────────────────────────────────────
function DatePicker({ value, onChange, error }) {
  const [mode, setMode] = useState('bs') // 'bs' | 'ad'

  // Derive BS state from ISO value
  const bsCurrent = value ? isoToBs(value) : null
  const todayIso = new Date().toISOString().split('T')[0]

  // BS picker state
  const defaultBs = bsCurrent || isoToBs(todayIso)
  const [bsYear,  setBsYear]  = useState(defaultBs?.year  || 2082)
  const [bsMonth, setBsMonth] = useState(defaultBs?.month || 1)
  const [bsDay,   setBsDay]   = useState(defaultBs?.day   || 1)

  // Whenever BS dropdowns change, emit ISO
  function emitBs(y, m, d) {
    const maxDay = bsMonthDays(y, m)
    const safeDay = Math.min(d, maxDay)
    if (safeDay !== d) setBsDay(safeDay)
    onChange(bsToIso(y, m, safeDay))
  }

  function handleBsYear(y)  { setBsYear(y);  emitBs(y, bsMonth, bsDay) }
  function handleBsMonth(m) { setBsMonth(m); emitBs(bsYear, m, bsDay) }
  function handleBsDay(d)   { setBsDay(d);   emitBs(bsYear, bsMonth, d) }

  // Days available for selected BS year+month
  const daysInMonth = bsMonthDays(bsYear, bsMonth)

  // Cross-display: show equivalent in the other calendar
  const adEquivalent = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null
  const bsEquivalent = bsCurrent
    ? `${bsCurrent.day} ${BS_MONTHS[bsCurrent.month - 1]} ${bsCurrent.year} BS`
    : null

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">Loan Date *</label>
        {/* Toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('bs')}
            className={`px-3 py-1 transition-colors ${
              mode === 'bs'
                ? 'bg-nepal-red text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            BS (नेपाली)
          </button>
          <button
            type="button"
            onClick={() => setMode('ad')}
            className={`px-3 py-1 transition-colors ${
              mode === 'ad'
                ? 'bg-nepal-red text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            AD (English)
          </button>
        </div>
      </div>

      {mode === 'bs' ? (
        <div className="space-y-2">
          {/* Three BS dropdowns */}
          <div className="flex gap-2">
            {/* Year */}
            <select
              className="input-field flex-1"
              value={bsYear}
              onChange={(e) => handleBsYear(Number(e.target.value))}
            >
              {[...BS_YEAR_RANGE].reverse().map((y) => (
                <option key={y} value={y}>{y} BS</option>
              ))}
            </select>

            {/* Month */}
            <select
              className="input-field flex-1"
              value={bsMonth}
              onChange={(e) => handleBsMonth(Number(e.target.value))}
            >
              {BS_MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name} ({BS_MONTHS_NP[i]})
                </option>
              ))}
            </select>

            {/* Day */}
            <select
              className="input-field w-20"
              value={bsDay}
              onChange={(e) => handleBsDay(Number(e.target.value))}
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Show AD equivalent */}
          {adEquivalent && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="text-slate-400">≡</span>
              {adEquivalent} (AD)
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="date"
            className="input-field"
            value={value || ''}
            max={todayIso}
            onChange={(e) => {
              const iso = e.target.value
              onChange(iso)
              if (iso) {
                const bs = isoToBs(iso)
                if (bs) { setBsYear(bs.year); setBsMonth(bs.month); setBsDay(bs.day) }
              }
            }}
          />
          {/* Show BS equivalent */}
          {bsEquivalent && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="text-slate-400">≡</span>
              {bsEquivalent}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

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

  // Auto-set sensible interest type when lender type changes
  function setLenderType(val) {
    const info = LENDER_TYPES.find((t) => t.value === val)
    setForm((prev) => ({
      ...prev,
      lenderType: val,
      interestType: info?.interestType || 'simple',
    }))
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
    if (new Date(form.loanDate) > new Date()) e.loanDate = 'Loan date cannot be in the future'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      ...form,
      id: loan?.id || uuidv4(),
      principal: form.principal.toString().replace(/,/g, ''),
      interestRate: form.interestRate.toString(),
    })
    onClose()
  }

  // Compute annual rate for warnings and preview
  const rawRate = parseFloat(form.interestRate) || 0
  const annualRate = form.rateType === 'monthly' ? rawRate * 12 : rawRate
  const monthlyRate = annualRate / 12
  const rateWarning = form.interestRate ? getRateWarning(form.lenderType, annualRate) : null

  const previewText =
    rawRate > 0
      ? `${annualRate.toFixed(2)}% per annum  ·  ${monthlyRate.toFixed(3)}% per month`
      : null

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'Edit Loan' : 'Add New Loan'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? 'Update loan details' : 'Record a loan in your tracker'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Rate reference (collapsible) */}
          <RateReference activeType={form.lenderType} />

          {/* Lender section */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Lender Details</h3>

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
                <label className="label">Lender Type *</label>
                <select
                  className="input-field"
                  value={form.lenderType}
                  onChange={(e) => setLenderType(e.target.value)}
                >
                  {LENDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contextual hint for selected lender type */}
            <LenderHint lenderType={form.lenderType} />
          </div>

          {/* Borrower + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <DatePicker
                value={form.loanDate}
                onChange={(iso) => set('loanDate', iso)}
                error={errors.loanDate}
              />
            </div>
          </div>

          {/* Financial details */}
          <div className="bg-red-50 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Loan Amount & Interest</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Principal */}
              <div>
                <label className="label">Principal Amount (NPR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₨</span>
                  <input
                    className="input-field pl-7"
                    placeholder="e.g. 200000"
                    value={form.principal}
                    onChange={(e) => set('principal', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
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
                    title="Rate period"
                  >
                    <option value="monthly">/ Month</option>
                    <option value="annual">/ Year</option>
                  </select>
                </div>

                {errors.interestRate && (
                  <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>
                )}

                {/* Rate preview */}
                {previewText && !errors.interestRate && (
                  <p className="text-xs text-slate-500 mt-1 font-medium">{previewText}</p>
                )}

                {/* Rate warning */}
                {rateWarning && (
                  <div
                    className={`mt-2 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                      rateWarning.level === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{rateWarning.msg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interest type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Interest Calculation
                  <span className="ml-1 text-slate-400 font-normal text-xs">(ब्याज गणना)</span>
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'simple', icon: '📐', label: 'Simple', nepali: 'साधारण' },
                    { key: 'compound', icon: '📈', label: 'Compound', nepali: 'चक्रवृद्धि' },
                  ].map(({ key, icon, label, nepali }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('interestType', key)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                        form.interestType === key
                          ? 'bg-nepal-red text-white border-nepal-red'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-nepal-red'
                      }`}
                    >
                      {icon} {label}
                      <span className="block text-xs opacity-70">{nepali}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {form.interestType === 'simple'
                    ? 'Interest is calculated only on the original principal. Common for sahukars and cooperatives in Terai.'
                    : 'Interest is added to principal each period — "Byaj ma Byaj" (ब्याजमा ब्याज). Common with banks. Used illegally by some moneylenders.'}
                </p>
              </div>

              {form.interestType === 'compound' && (
                <div>
                  <label className="label">Compounded Every</label>
                  <select
                    className="input-field"
                    value={form.compoundFrequency}
                    onChange={(e) => set('compoundFrequency', e.target.value)}
                  >
                    <option value="monthly">Monthly — महिनावारी (12x/year) · Banks standard</option>
                    <option value="quarterly">Quarterly — त्रैमासिक (4x/year)</option>
                    <option value="annually">Annually — वार्षिक (1x/year)</option>
                  </select>
                  {form.lenderType === 'person' && (
                    <div className="mt-2 flex items-start gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Compound interest from an informal sahukar is considered "Meter Byaj" — exploitative and illegal under Nepal law if excessive.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder={
                  form.lenderType === 'person'
                    ? 'Purpose, collateral (land/gold?), verbal agreement details...'
                    : form.lenderType === 'cooperative'
                    ? 'Loan purpose, group guarantee, installment plan...'
                    : form.lenderType === 'microfinance'
                    ? 'Group (samuh) name, field officer, kista amount...'
                    : 'Account number, EMI amount, loan officer...'
                }
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => set('isActive', true)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    form.isActive
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-green-600'
                  }`}
                >
                  ✅ Active
                  <span className="block text-xs opacity-80">बाँकी छ</span>
                </button>
                <button
                  type="button"
                  onClick={() => set('isActive', false)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    !form.isActive
                      ? 'bg-slate-500 text-white border-slate-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-500'
                  }`}
                >
                  🏁 Paid/Closed
                  <span className="block text-xs opacity-80">चुक्ता भयो</span>
                </button>
              </div>
              {!form.isActive && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Closed loans are excluded from dashboard totals
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
