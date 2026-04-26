import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatNPR, toLakh } from '../utils/calculations'
import { Info, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react'
import {
  bsToAd, adToBs, todayBs, bsDaysInMonth,
  BS_MONTHS_NP,
  BS_MAX_YEAR,
} from '../utils/bsCalendar'

const LOAN_TYPES = [
  { id: 'agri_women',   label: 'Agri – Women',       labelNp: 'कृषि – महिला',  icon: '👩‍🌾', min:3,  max:4,  def:3,  color:'#16a34a' },
  { id: 'agri_general', label: 'Agri – General',     labelNp: 'कृषि – सामान्य', icon: '🌾',   min:2,  max:3,  def:2,  color:'#84cc16' },
  { id: 'microfinance', label: 'Microfinance (MFI)', labelNp: 'लघुवित्त',        icon: '🏘️',   min:10, max:15, def:12, color:'#f97316' },
  { id: 'cooperative',  label: 'Cooperative',        labelNp: 'सहकारी',          icon: '🤝',   min:12, max:18, def:14, color:'#8b5cf6' },
  { id: 'bank_agri',    label: 'Bank – Agricultural',labelNp: 'वाणिज्य बैंक',   icon: '🏦',   min:5,  max:7,  def:6,  color:'#0ea5e9' },
  { id: 'deprived',     label: 'Deprived Sector',    labelNp: 'विपन्न वर्ग',     icon: '🌿',   min:8,  max:12, def:10, color:'#14b8a6' },
  { id: 'custom',       label: 'Custom / Informal',  labelNp: 'अनौपचारिक',       icon: '📝',   min:0,  max:60, def:18, color:'#ef4444' },
]

const FREQS = [
  { value:'monthly',   label:'Monthly',   n:12 },
  { value:'quarterly', label:'Quarterly', n:4  },
  { value:'annually',  label:'Annually',  n:1  },
]

const NRB_INFO = [
  { type:'Agri Subsidy – Women',   rate:'3–4%',   institution:'ADBL / Commercial Banks',       note:'Max NPR 5,00,000. NRB Priority Sector.' },
  { type:'Agri Subsidy – General', rate:'2–3%',   institution:'ADBL / Commercial Banks',       note:'Paddy, maize, jute, sugarcane.' },
  { type:'Microfinance (MFI)',     rate:'≤15%',   institution:'NRB-Regulated MFIs',            note:'2025: Base rate + max 9 percentage pts.' },
  { type:'Cooperative',            rate:'12–18%', institution:'Savings & Credit Cooperatives', note:'3 months to 3 years. Member-based.' },
  { type:'Commercial Bank Agri',   rate:'5–7%',   institution:'Class A Banks (PSLP)',          note:'10% portfolio mandatory to agriculture.' },
  { type:'Deprived Sector',        rate:'8–12%',  institution:'Banks & Finance Companies',     note:'NRB Directive 17/067. 5% of portfolio.' },
]

const TODAY_BS = todayBs() || { year:2082, month:12, day:25 }

function BsDatePicker({ label, labelNp, value, onChange }) {
  const { year, month, day } = value
  const maxDay = bsDaysInMonth(year, month)

  function update(field, val) {
    const next = { ...value, [field]: parseInt(val) }
    const max = bsDaysInMonth(next.year, next.month)
    if (next.day > max) next.day = max
    onChange(next)
  }

  const adDate = bsToAd(year, month, day)
  const adStr  = adDate
    ? adDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : '—'

  function handleAdInput(e) {
    const d = new Date(e.target.value)
    if (isNaN(d)) return
    const bs = adToBs(d)
    if (bs) onChange(bs)
  }

  const adIsoVal = adDate ? adDate.toISOString().split('T')[0] : ''

  return (
    <div className="card p-3 xs:p-4 border-l-4 border-nepal-red min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-nepal-red shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 truncate">{label}</p>
          <p className="text-xs text-slate-400 truncate">{labelNp}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <p className="text-[10px] text-slate-400 mb-1">साल</p>
          <select
            className="input-field text-xs xs:text-sm py-2"
            value={year}
            aria-label={`${label} — year (BS)`}
            onChange={(e) => update('year', e.target.value)}
          >
            {Array.from({ length: Math.min(BS_MAX_YEAR, 2095) - 2020 + 1 }, (_, i) => 2020 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-1">महिना</p>
          <select
            className="input-field text-xs xs:text-sm py-2"
            value={month}
            aria-label={`${label} — month (BS)`}
            onChange={(e) => update('month', e.target.value)}
          >
            {BS_MONTHS_NP.map((mn, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}. {mn}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-1">गते</p>
          <select
            className="input-field text-xs xs:text-sm py-2"
            value={day}
            aria-label={`${label} — day (BS)`}
            onChange={(e) => update('day', e.target.value)}
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <span className="text-xs font-semibold text-nepal-red truncate">
          {BS_MONTHS_NP[month - 1]} {day}, {year} BS
        </span>
        <span className="text-xs text-slate-400 truncate">{adStr} AD</span>
      </div>

      <details className="mt-2">
        <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">
          Enter AD date instead ↓
        </summary>
        <input
          type="date"
          className="input-field text-sm mt-1.5"
          value={adIsoVal}
          onChange={handleAdInput}
          aria-label={`${label} as AD date`}
        />
      </details>
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-4">
          <span style={{ color: e.color }}>{e.name}</span>
          <span className="font-mono font-bold currency">{formatNPR(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function NepalLoanCalculator() {
  const [typeId,    setTypeId]    = useState('microfinance')
  const [principal, setPrincipal] = useState('100000')
  const [rate,      setRate]      = useState('12')
  const [freq,      setFreq]      = useState('monthly')
  const [inputMode, setInputMode] = useState('date')

  const [startDate, setStartDate] = useState({ year: TODAY_BS.year - 1, month: 1, day: 1 })
  const [endDate,   setEndDate]   = useState({ year: TODAY_BS.year, month: TODAY_BS.month, day: TODAY_BS.day })

  const [termYears,  setTermYears]  = useState('3')
  const [termMonths, setTermMonths] = useState('0')

  const [showInfo, setShowInfo] = useState(false)

  const lt = LOAN_TYPES.find((t) => t.id === typeId)
  const fn = FREQS.find((f) => f.value === freq)

  function pickType(id) {
    setTypeId(id)
    const t = LOAN_TYPES.find((x) => x.id === id)
    if (t) setRate(String(t.def))
  }

  const dateDays = useMemo(() => {
    const a = bsToAd(startDate.year, startDate.month, startDate.day)
    const b = bsToAd(endDate.year, endDate.month, endDate.day)
    if (!a || !b) return 0
    return Math.max(0, Math.round((b - a) / 86400000))
  }, [startDate, endDate])

  const dateYears = dateDays / 365.25

  const effectiveYears = inputMode === 'date'
    ? dateYears
    : (parseFloat(termYears) || 0) + (parseFloat(termMonths) || 0) / 12

  const durationLabel = useMemo(() => {
    if (inputMode !== 'date' || dateDays <= 0) return null
    const y = Math.floor(dateDays / 365)
    const rem = dateDays % 365
    const m = Math.floor(rem / 30)
    const d = rem % 30
    const parts = []
    if (y > 0) parts.push(`${y}y`)
    if (m > 0) parts.push(`${m}m`)
    if (d > 0) parts.push(`${d}d`)
    return parts.length ? `${parts.join(' ')} · ${dateDays} days` : '0 days'
  }, [inputMode, dateDays])

  const calc = useMemo(() => {
    const P = parseFloat(principal) || 0
    const r = parseFloat(rate) || 0
    const t = effectiveYears
    const n = fn.n

    if (P <= 0 || r <= 0 || t <= 0) return null

    const compTotal    = P * Math.pow(1 + r / (100 * n), n * t)
    const compInterest = compTotal - P
    const simpInterest = P * (r / 100) * t
    const ear          = (Math.pow(1 + r / (100 * n), n) - 1) * 100
    const totalMo      = Math.max(1, Math.round(t * 12))
    const mr           = r / 100 / 12
    const emi          = mr > 0 ? (P * mr * Math.pow(1 + mr, totalMo)) / (Math.pow(1 + mr, totalMo) - 1) : P / totalMo

    const step = Math.max(1, Math.ceil(totalMo / 24))
    const chart = []
    for (let m = 0; m <= totalMo; m += step) {
      const tt = m / 12
      chart.push({
        label: m === 0 ? 'Start' : m % 12 === 0 ? `Yr ${m / 12}` : `M${m}`,
        Compound: Math.round(P + P * (Math.pow(1 + r / (100 * n), n * tt) - 1)),
        Simple:   Math.round(P + P * (r / 100) * tt),
      })
    }

    return {
      P, r, t, n,
      compTotal:    Math.round(compTotal),
      compInterest: Math.round(compInterest),
      simpInterest: Math.round(simpInterest),
      simpTotal:    Math.round(P + simpInterest),
      extra:        Math.round(compInterest - simpInterest),
      ear:          ear.toFixed(2),
      emi:          Math.round(emi),
      chart,
    }
  }, [principal, rate, effectiveYears, fn])

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">

      {/* Header */}
      <div className="text-center py-3 sm:py-6">
        <div className="text-3xl sm:text-5xl mb-1 sm:mb-3" aria-hidden="true">🏔️</div>
        <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Nepali Loan Calculator</h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">नेपाली ऋण क्याल्कुलेटर · Compound Interest · BS &amp; AD Dates</p>
      </div>

      {/* Loan Type Pills — scroll-snap on mobile, wrap on sm+ */}
      <div className="card p-3 sm:p-4">
        <p className="text-xs font-semibold text-slate-500 mb-2 sm:mb-3 uppercase tracking-wide">
          Loan Type · ऋण प्रकार
        </p>
        <div className="flex sm:flex-wrap gap-2 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar scroll-snap-x">
          {LOAN_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => pickType(t.id)}
              aria-pressed={typeId === t.id}
              className={`snap-start shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-[transform,colors,box-shadow] duration-180 ease-ios active:scale-[0.97] min-h-[40px] whitespace-nowrap ${
                typeId === t.id
                  ? 'text-white shadow-sm border-transparent'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
              style={typeId === t.id ? { backgroundColor: lt.color } : {}}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              <span className={`ml-1 font-mono ${typeId === t.id ? 'opacity-80' : 'text-slate-400'}`}>
                {t.min === t.max ? `${t.min}%` : `${t.min}–${t.max}%`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Date / Duration toggle */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden" role="tablist" aria-label="Input mode">
            {[
              { id: 'date',     icon: Calendar, en: 'Date',     np: 'मिति' },
              { id: 'duration', icon: Clock,    en: 'Duration', np: 'अवधि' },
            ].map(({ id, icon: Icon, en, np }) => (
              <button
                key={id}
                role="tab"
                aria-selected={inputMode === id}
                onClick={() => setInputMode(id)}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] text-xs font-semibold transition-[background-color,color] duration-180 ${
                  inputMode === id ? 'bg-nepal-red text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {en} · {np}
              </button>
            ))}
          </div>
          {inputMode === 'date' && durationLabel && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full font-semibold">
              {durationLabel}
            </span>
          )}
        </div>

        {inputMode === 'date' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <BsDatePicker label="Loan Taken Date" labelNp="रकम लिएको मिति" value={startDate} onChange={setStartDate} />
            <BsDatePicker label="Return / Repay Date" labelNp="रकम बुझाउने मिति" value={endDate} onChange={setEndDate} />
          </div>
        )}

        {inputMode === 'duration' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cal-yr" className="label">Years · वर्ष</label>
              <select id="cal-yr" className="input-field text-sm" value={termYears} onChange={(e) => setTermYears(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i}>{i} yr</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cal-mo" className="label">Months · महिना</label>
              <select id="cal-mo" className="input-field text-sm" value={termMonths} onChange={(e) => setTermMonths(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} mo</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Principal + Rate + Frequency */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label htmlFor="cal-p" className="label">Principal (NPR) · मूलधन</label>
            <input
              id="cal-p"
              type="number"
              className="input-field currency"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              min="1000"
              step="1000"
              placeholder="100000"
              inputMode="numeric"
              enterKeyHint="next"
            />
            {parseFloat(principal) > 0 && (
              <p className="text-xs text-slate-400 mt-1 currency">
                {formatNPR(parseFloat(principal))} · {toLakh(parseFloat(principal))}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="cal-r" className="label">
              Annual Rate (%) · वार्षिक ब्याज
              <span className="ml-1 font-normal text-slate-400">suggested {lt.min}–{lt.max}%</span>
            </label>
            <input
              id="cal-r"
              type="number"
              className="input-field currency"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="0.1"
              max="100"
              step="0.1"
              inputMode="decimal"
              enterKeyHint="next"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[...new Set([lt.min, lt.def, lt.max])].map((v) => (
                <button
                  key={v}
                  onClick={() => setRate(String(v))}
                  aria-pressed={rate === String(v)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-180 active:scale-[0.97] min-h-[32px] ${
                    rate === String(v)
                      ? 'text-white border-transparent'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={rate === String(v) ? { backgroundColor: lt.color } : {}}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="label">Compounding · चक्रवृद्धि आवृत्ति</p>
          <div className="grid grid-cols-3 gap-2">
            {FREQS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFreq(f.value)}
                aria-pressed={freq === f.value}
                className={`py-2.5 text-xs font-semibold rounded-xl border transition-[transform,colors] duration-180 ease-ios active:scale-[0.97] min-h-[44px] ${
                  freq === f.value ? 'text-white border-transparent bg-nepal-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {calc ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label:'Total Payable',     value:formatNPR(calc.compTotal),    sub:toLakh(calc.compTotal),                                           bdr:'border-slate-200' },
              { label:'Compound Interest', value:formatNPR(calc.compInterest), sub:`${((calc.compInterest / calc.P) * 100).toFixed(1)}% of principal`, bdr:'border-t-2', style:{ borderTopColor: lt.color } },
              { label:'vs Simple',         value:`+${formatNPR(calc.extra)}`,  sub:'extra compounding cost',                                          bdr:'border-t-2 border-amber-400' },
              { label:'Monthly EMI',       value:formatNPR(calc.emi),          sub:`EAR ${calc.ear}%`,                                                bdr:'border-t-2 border-nepal-blue' },
            ].map((c, i) => (
              <div key={i} className={`card p-2.5 sm:p-4 text-center min-w-0 ${c.bdr}`} style={c.style}>
                <p className="text-[10px] sm:text-xs text-slate-500 mb-1 truncate">{c.label}</p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 currency truncate">{c.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 sm:mb-4">Compound vs Simple Interest</h3>
            <div className="space-y-4">
              {[
                { label:'Compound Interest', val:calc.compInterest, total:calc.compTotal, color:lt.color },
                { label:'Simple Interest',   val:calc.simpInterest, total:calc.simpTotal, color:'#94a3b8' },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1.5 gap-2">
                    <span className="font-semibold text-slate-600">{b.label}</span>
                    <span className="font-mono font-bold text-slate-700 currency">{formatNPR(b.val)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-ios"
                      style={{ width: `${Math.min(100, (b.val / calc.compTotal) * 100)}%`, backgroundColor: b.color }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 currency">Total: {formatNPR(b.total)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 break-words">
              {inputMode === 'date' && durationLabel
                ? <>Loan from <strong>{BS_MONTHS_NP[startDate.month - 1]} {startDate.day}, {startDate.year}</strong> to <strong>{BS_MONTHS_NP[endDate.month - 1]} {endDate.day}, {endDate.year}</strong> ({durationLabel}) at <strong>{calc.r}%</strong> → compounding adds <strong>{formatNPR(calc.extra)}</strong> extra. EAR: <strong>{calc.ear}%</strong></>
                : <>At <strong>{calc.r}%</strong> over <strong>{calc.t.toFixed(1)} yrs</strong> compounding adds <strong>{formatNPR(calc.extra)}</strong> extra. EAR: <strong>{calc.ear}%</strong></>
              }
            </p>
          </div>

          <div className="card p-4 sm:p-5 min-w-0">
            <h3 className="text-sm font-bold text-slate-700 mb-3 sm:mb-4">Balance Growth · ऋण वृद्धि</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calc.chart} margin={{ top:5, right:10, left:5, bottom:5 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lt.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={lt.color} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize:10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize:10 }} width={52} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Area type="monotone" dataKey="Compound" stroke={lt.color} fill="url(#cg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Simple"   stroke="#94a3b8" fill="url(#sg)" strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-8 sm:p-10 text-center text-slate-400">
          <div className="text-3xl sm:text-4xl mb-2" aria-hidden="true">🧮</div>
          <p className="text-sm">
            {inputMode === 'date' && dateDays <= 0
              ? 'Return date must be after the loan taken date.'
              : 'Enter loan details above to calculate.'}
          </p>
        </div>
      )}

      {/* Info Toggle */}
      <button
        onClick={() => setShowInfo((v) => !v)}
        aria-expanded={showInfo}
        className="w-full card p-4 flex items-center justify-between text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors min-h-[52px]"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-nepal-red" aria-hidden="true" />
          NRB Guidelines &amp; Terai Lending Context
        </div>
        {showInfo ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
      </button>

      {showInfo && (
        <div className="space-y-4 pb-4">
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">NRB Rate Reference 2025</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="sr-only">
                  NRB-published interest-rate reference for 2025 across loan types, institutions and notes.
                </caption>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left p-2 font-semibold text-slate-500">Loan Type</th>
                    <th scope="col" className="text-center p-2 font-semibold text-slate-500">Rate</th>
                    <th scope="col" className="text-left p-2 font-semibold text-slate-500 hidden sm:table-cell">Institution</th>
                    <th scope="col" className="text-left p-2 font-semibold text-slate-500 hidden md:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {NRB_INFO.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2 text-slate-700 font-medium">{r.type}</td>
                      <td className="p-2 text-center font-mono font-bold text-nepal-red currency">{r.rate}</td>
                      <td className="p-2 text-slate-500 hidden sm:table-cell">{r.institution}</td>
                      <td className="p-2 text-slate-400 hidden md:table-cell">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="card p-4">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Terai Context · तराई सन्दर्भ</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li className="flex gap-2"><span aria-hidden="true">🌾</span><span>Terai contributes ~65% of Nepal's agricultural output.</span></li>
                <li className="flex gap-2"><span aria-hidden="true">🏘️</span><span>Grameen group-lending model is most prevalent in Terai.</span></li>
                <li className="flex gap-2"><span aria-hidden="true">🌿</span><span>Tharu &amp; Madhesi communities are primary targets of NRB deprived sector mandate.</span></li>
                <li className="flex gap-2"><span aria-hidden="true">⚠️</span><span>Informal moneylender rates in rural Terai can reach 24–60%+ annually.</span></li>
              </ul>
            </div>
            <div className="card p-4">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Compound Interest · चक्रवृद्धि ब्याज</h4>
              <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-center mb-2">
                <p className="text-slate-500 mb-1">A = P × (1 + r/n)^(n×t)</p>
                <p className="text-slate-500">EAR = (1 + r/n)^n − 1</p>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                <span><strong>P</strong> = Principal</span><span><strong>r</strong> = Annual rate</span>
                <span><strong>n</strong> = Compoundings/yr</span><span><strong>t</strong> = Time in years</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Date Mode uses exact days between BS dates for precision.</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs text-blue-700">
              <strong>Disclaimer:</strong> BS calendar data follows standard Nepal government tables. Rates based on NRB guidelines 2025. Always verify with your lender.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
