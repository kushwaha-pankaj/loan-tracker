import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { formatNPR, toLakh } from '../utils/calculations'

// ── Terai Loan Type Presets ───────────────────────────────────────────────────
const LOAN_TYPES = [
  {
    id: 'agri_subsidy_women',
    label: 'Agricultural Loan – Women (Subsidised)',
    labelNp: 'कृषि ऋण – महिला (सब्सिडी)',
    icon: '👩‍🌾',
    minRate: 3,
    maxRate: 4,
    defaultRate: 3,
    description: 'Government-subsidised agricultural loan for women borrowers in Terai. NRB mandated subsidised rate.',
    institution: 'Agricultural Development Bank (ADBL) / Commercial Banks',
    notes: 'Max loan: NPR 5,00,000. Nepal Rastra Bank subsidy scheme under Priority Sector Lending.',
    color: '#16a34a',
  },
  {
    id: 'agri_subsidy_general',
    label: 'Agricultural Loan – General (Subsidised)',
    labelNp: 'कृषि ऋण – सामान्य (सब्सिडी)',
    icon: '🌾',
    minRate: 2,
    maxRate: 3,
    defaultRate: 2,
    description: 'Government-subsidised agricultural loan for general borrowers. Terai paddy, maize, and cash crop cultivation.',
    institution: 'Agricultural Development Bank (ADBL) / Commercial Banks',
    notes: 'Max loan: NPR 5,00,000. Covers paddy, maize, jute, sugarcane, vegetables.',
    color: '#84cc16',
  },
  {
    id: 'microfinance',
    label: 'Microfinance Loan (MFI)',
    labelNp: 'लघुवित्त ऋण',
    icon: '🏘️',
    minRate: 10,
    maxRate: 15,
    defaultRate: 12,
    description: 'Regulated by Nepal Rastra Bank. Common in Terai via Grameen Bank group-lending model. Rate = Base Rate + max 9%.',
    institution: 'Microfinance Institutions (MFIs) – NRB Regulated',
    notes: 'From Shrawan 1, 2025: rate = MFI base rate + up to 3 percentage points premium.',
    color: '#f97316',
  },
  {
    id: 'cooperative',
    label: 'Cooperative Loan',
    labelNp: 'सहकारी ऋण',
    icon: '🤝',
    minRate: 12,
    maxRate: 18,
    defaultRate: 14,
    description: 'Savings and Credit Cooperatives (SCCs) are common in Terai districts. Lower operational cost than MFIs.',
    institution: 'Savings & Credit Cooperatives (सहकारी)',
    notes: 'Typical term: 3 months to 3 years. Member-based lending with savings linkage.',
    color: '#8b5cf6',
  },
  {
    id: 'bank_agricultural',
    label: 'Commercial Bank – Agricultural',
    labelNp: 'वाणिज्य बैंक – कृषि',
    icon: '🏦',
    minRate: 5,
    maxRate: 7,
    defaultRate: 6,
    description: 'Priority Sector Lending Programme (PSLP). Banks must allocate 10% of portfolio to agriculture at subsidised rates.',
    institution: 'Commercial Banks (Class A)',
    notes: '10% of total loan portfolio mandatorily allocated to agriculture under NRB directives.',
    color: '#0ea5e9',
  },
  {
    id: 'deprived_sector',
    label: 'Deprived Sector Loan',
    labelNp: 'विपन्न वर्ग ऋण',
    icon: '🌿',
    minRate: 8,
    maxRate: 12,
    defaultRate: 10,
    description: 'NRB Directive 17/067: Mandatory lending to low-income, socially backward groups including Tharu communities of Terai.',
    institution: 'Banks, Development Banks & Finance Companies',
    notes: 'Commercial banks: 5% of portfolio. Development banks: 4.5-5%. Finance companies: 4%.',
    color: '#14b8a6',
  },
  {
    id: 'custom',
    label: 'Custom / Informal Lender',
    labelNp: 'अनौपचारिक ऋण',
    icon: '📝',
    minRate: 0,
    maxRate: 60,
    defaultRate: 18,
    description: 'Private moneylender or informal loan. Enter actual rate negotiated. Can be very high in rural Terai.',
    institution: 'Private Individual / Informal Lender',
    notes: 'Informal lending rates in rural Terai can range from 18% to 60%+ annually. Beware of predatory lending.',
    color: '#ef4444',
  },
]

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', labelNp: 'मासिक', n: 12 },
  { value: 'quarterly', label: 'Quarterly', labelNp: 'त्रैमासिक', n: 4 },
  { value: 'annually', label: 'Annually', labelNp: 'वार्षिक', n: 1 },
]

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-semibold">{formatNPR(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── EMI Calculator helper ─────────────────────────────────────────────────────
function calcEMI(principal, annualRate, months) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NepalTeraiCalculator() {
  const [loanTypeId, setLoanTypeId]       = useState('microfinance')
  const [principal, setPrincipal]         = useState('100000')
  const [rate, setRate]                   = useState('12')
  const [frequency, setFrequency]         = useState('monthly')
  const [termYears, setTermYears]         = useState('3')
  const [termMonths, setTermMonths]       = useState('0')
  const [showInfo, setShowInfo]           = useState(null) // loanTypeId being shown

  const loanType = LOAN_TYPES.find((t) => t.id === loanTypeId) || LOAN_TYPES[0]
  const freq     = FREQUENCIES.find((f) => f.value === frequency)

  // When loan type changes, reset rate to default
  function handleLoanTypeChange(id) {
    setLoanTypeId(id)
    const t = LOAN_TYPES.find((lt) => lt.id === id)
    if (t) setRate(String(t.defaultRate))
  }

  // ── Core calculations ─────────────────────────────────────────────────────
  const results = useMemo(() => {
    const P     = parseFloat(principal) || 0
    const r     = parseFloat(rate) || 0
    const years = (parseFloat(termYears) || 0) + (parseFloat(termMonths) || 0) / 12
    const n     = freq.n

    if (P <= 0 || r <= 0 || years <= 0) return null

    // Compound interest
    const compoundTotal    = P * Math.pow(1 + r / (100 * n), n * years)
    const compoundInterest = compoundTotal - P

    // Simple interest (for comparison)
    const simpleInterest   = P * (r / 100) * years
    const simpleTotal      = P + simpleInterest

    // Effective Annual Rate
    const ear = (Math.pow(1 + r / (100 * n), n) - 1) * 100

    // EMI (monthly instalment on compound basis)
    const totalMonths = Math.round(years * 12)
    const emi = totalMonths > 0 ? calcEMI(P, r, totalMonths) : 0

    // Month-by-month schedule (max 120 months for display, sampled)
    const schedule = []
    const step = totalMonths <= 24 ? 1 : totalMonths <= 60 ? 3 : 6
    for (let m = 0; m <= totalMonths; m += step) {
      const t = m / 12
      const cInterest = P * (Math.pow(1 + r / (100 * n), n * t) - 1)
      const sInterest = P * (r / 100) * t
      schedule.push({
        month: m === 0 ? 'Start' : m < 12 ? `M${m}` : `Y${Math.floor(m / 12)}${m % 12 !== 0 ? `M${m % 12}` : ''}`,
        Principal: Math.round(P),
        'Compound Balance': Math.round(P + cInterest),
        'Simple Balance': Math.round(P + sInterest),
        'Compound Interest': Math.round(cInterest),
        'Simple Interest': Math.round(sInterest),
      })
    }
    // Ensure last point is included
    if (totalMonths % step !== 0) {
      const cFinal = P * (Math.pow(1 + r / (100 * n), n * years) - 1)
      const sFinal = P * (r / 100) * years
      schedule.push({
        month: `End`,
        Principal: Math.round(P),
        'Compound Balance': Math.round(P + cFinal),
        'Simple Balance': Math.round(P + sFinal),
        'Compound Interest': Math.round(cFinal),
        'Simple Interest': Math.round(sFinal),
      })
    }

    // Amortisation table (monthly, first 12 and last 3 rows)
    const amortRows = []
    if (totalMonths > 0 && emi > 0) {
      let balance = P
      for (let m = 1; m <= totalMonths; m++) {
        const monthlyR = r / 100 / 12
        const interestPart  = balance * monthlyR
        const principalPart = emi - interestPart
        balance = Math.max(0, balance - principalPart)
        if (m <= 6 || m > totalMonths - 3) {
          amortRows.push({
            month: m,
            emi: Math.round(emi),
            principal: Math.round(principalPart),
            interest: Math.round(interestPart),
            balance: Math.round(balance),
          })
        } else if (m === 7) {
          amortRows.push({ month: '…', emi: null, principal: null, interest: null, balance: null })
        }
      }
    }

    return {
      P, r, years, n,
      compoundTotal: Math.round(compoundTotal),
      compoundInterest: Math.round(compoundInterest),
      simpleTotal: Math.round(simpleTotal),
      simpleInterest: Math.round(simpleInterest),
      extraCost: Math.round(compoundInterest - simpleInterest),
      ear: ear.toFixed(2),
      emi: Math.round(emi),
      totalMonths,
      schedule,
      amortRows,
    }
  }, [principal, rate, frequency, termYears, termMonths, freq])

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🏔️</div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Nepal Terai Compound Interest Calculator
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              तराई क्षेत्र चक्रवृद्धि ब्याज क्याल्कुलेटर
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Specialised calculator for loan types common in Nepal's Terai (plains) region — including NRB-regulated microfinance, agricultural subsidised loans, cooperatives, and deprived sector lending. Interest rates reflect Nepal Rastra Bank (NRB) guidelines effective 2025.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Panel: Inputs ────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Loan Type */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Loan Type · ऋण प्रकार</h3>
            <div className="space-y-2">
              {LOAN_TYPES.map((lt) => (
                <button
                  key={lt.id}
                  onClick={() => handleLoanTypeChange(lt.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2.5 ${
                    loanTypeId === lt.id
                      ? 'border-nepal-red bg-red-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{lt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${loanTypeId === lt.id ? 'text-nepal-red' : 'text-slate-700'}`}>
                      {lt.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{lt.labelNp}</p>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg text-white whitespace-nowrap"
                    style={{ backgroundColor: lt.color }}
                  >
                    {lt.minRate === lt.maxRate ? `${lt.minRate}%` : `${lt.minRate}–${lt.maxRate}%`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Loan Parameters */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Loan Parameters · ऋण विवरण</h3>

            {/* Principal */}
            <div>
              <label className="label">Principal Amount (NPR) · मूलधन</label>
              <input
                type="number"
                className="input-field"
                value={principal}
                min="1000"
                step="1000"
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="e.g. 100000"
              />
              {parseFloat(principal) > 0 && (
                <p className="text-xs text-slate-400 mt-1">{toLakh(parseFloat(principal))} · {formatNPR(parseFloat(principal))}</p>
              )}
            </div>

            {/* Interest Rate */}
            <div>
              <label className="label">
                Annual Interest Rate (%) · वार्षिक ब्याज दर
                <span className="ml-2 font-normal text-slate-400">
                  Suggested: {loanType.minRate}–{loanType.maxRate}%
                </span>
              </label>
              <input
                type="number"
                className="input-field"
                value={rate}
                min="0.1"
                max="100"
                step="0.1"
                onChange={(e) => setRate(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                {loanTypeId !== 'custom' && [loanType.minRate, loanType.defaultRate, loanType.maxRate]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((v) => (
                    <button
                      key={v}
                      onClick={() => setRate(String(v))}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        rate === String(v)
                          ? 'bg-nepal-red text-white border-nepal-red'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
              </div>
            </div>

            {/* Compounding Frequency */}
            <div>
              <label className="label">Compounding Frequency · चक्रवृद्धि आवृत्ति</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={`px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                      frequency === f.value
                        ? 'bg-nepal-blue text-white border-nepal-blue'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {f.label}
                    <span className="block text-[10px] opacity-70">{f.labelNp}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Term */}
            <div>
              <label className="label">Loan Term · ऋण अवधि</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <select
                    className="input-field text-sm"
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i} value={i}>{i} {i === 1 ? 'Year' : 'Years'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="input-field text-sm"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{i} {i === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Loan Type Info */}
          <div className="card p-4 border-l-4" style={{ borderLeftColor: loanType.color }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{loanType.icon}</span>
              <h4 className="text-xs font-bold text-slate-700">{loanType.institution}</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{loanType.description}</p>
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-2 py-1.5">{loanType.notes}</p>
          </div>
        </div>

        {/* ── Right Panel: Results ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {results ? (
            <>
              {/* Result Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total Payable</p>
                  <p className="text-base font-bold text-slate-800">{formatNPR(results.compoundTotal)}</p>
                  <p className="text-xs text-slate-400">{toLakh(results.compoundTotal)}</p>
                </div>
                <div className="card p-4 text-center" style={{ borderTop: `3px solid ${loanType.color}` }}>
                  <p className="text-xs text-slate-500 mb-1">Compound Interest</p>
                  <p className="text-base font-bold" style={{ color: loanType.color }}>{formatNPR(results.compoundInterest)}</p>
                  <p className="text-xs text-slate-400">{((results.compoundInterest / results.P) * 100).toFixed(1)}% of principal</p>
                </div>
                <div className="card p-4 text-center border-t-2 border-amber-400">
                  <p className="text-xs text-slate-500 mb-1">Extra vs Simple</p>
                  <p className="text-base font-bold text-amber-600">+{formatNPR(results.extraCost)}</p>
                  <p className="text-xs text-slate-400">compounding cost</p>
                </div>
                <div className="card p-4 text-center border-t-2 border-nepal-blue">
                  <p className="text-xs text-slate-500 mb-1">Monthly EMI</p>
                  <p className="text-base font-bold text-nepal-blue">{formatNPR(results.emi)}</p>
                  <p className="text-xs text-slate-400">EAR: {results.ear}%</p>
                </div>
              </div>

              {/* Compound vs Simple comparison bar */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Compound vs Simple Interest Comparison</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Compound Interest', value: results.compoundInterest, total: results.compoundTotal, color: loanType.color },
                    { label: 'Simple Interest', value: results.simpleInterest, total: results.simpleTotal, color: '#94a3b8' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600">{item.label}</span>
                        <span className="font-mono font-semibold text-slate-700">{formatNPR(item.value)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(item.value / results.compoundTotal) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Total repayable: {formatNPR(item.total)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-semibold">
                    Compounding adds {formatNPR(results.extraCost)} extra cost over {results.years.toFixed(1)} years at {results.r}% with {frequency} compounding.
                    Effective Annual Rate (EAR): <strong>{results.ear}%</strong>
                  </p>
                </div>
              </div>

              {/* Growth Chart */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">
                  Balance Growth Over Time · समयसँगै ऋण वृद्धि
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.schedule} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="compoundGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={loanType.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={loanType.color} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="simpleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis
                        tickFormatter={(v) => toLakh(v)}
                        tick={{ fontSize: 10 }}
                        width={55}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="Compound Balance"
                        stroke={loanType.color}
                        fill="url(#compoundGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="Simple Balance"
                        stroke="#94a3b8"
                        fill="url(#simpleGrad)"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Interest Growth Comparison */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">
                  Interest Accumulation · ब्याज संचय
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.schedule} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize: 10 }} width={55} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="Compound Interest"
                        stroke={loanType.color}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Simple Interest"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Amortisation Table */}
              {results.amortRows.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">
                    Monthly Amortisation Schedule · मासिक किस्ता तालिका
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Month</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">EMI</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Principal</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Interest</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.amortRows.map((row, i) => (
                          <tr key={i} className={`border-b border-slate-100 ${row.month === '…' ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-2 font-mono text-slate-500">{row.month}</td>
                            {row.emi === null ? (
                              <td colSpan={4} className="px-3 py-1.5 text-center text-slate-400">⋯ {results.totalMonths - 9} more rows ⋯</td>
                            ) : (
                              <>
                                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatNPR(row.emi)}</td>
                                <td className="px-3 py-2 text-right font-mono text-nepal-blue">{formatNPR(row.principal)}</td>
                                <td className="px-3 py-2 text-right font-mono" style={{ color: loanType.color }}>{formatNPR(row.interest)}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{formatNPR(row.balance)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-10 text-center text-slate-400">
              <div className="text-5xl mb-3">🧮</div>
              <p className="text-sm">Enter loan details to see compound interest calculation.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── NRB Info Section ──────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">
          Nepal Rastra Bank (NRB) Guidelines & Terai Lending Context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Rate Reference Table */}
          <div className="md:col-span-1">
            <h4 className="text-xs font-bold text-slate-600 mb-2">NRB Rate Reference (2025)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2 font-semibold text-slate-500">Loan Type</th>
                    <th className="text-right p-2 font-semibold text-slate-500">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Agri Subsidy – Women', rate: '3–4%' },
                    { label: 'Agri Subsidy – General', rate: '2–3%' },
                    { label: 'MFI (NRB cap)', rate: '≤15%' },
                    { label: 'MFI (2025 new rule)', rate: 'BR+9%' },
                    { label: 'Cooperative', rate: '12–18%' },
                    { label: 'Commercial Bank Agri', rate: '5–7%' },
                    { label: 'Deprived Sector', rate: '8–12%' },
                  ].map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2 text-slate-600">{r.label}</td>
                      <td className="p-2 text-right font-mono font-semibold text-nepal-red">{r.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terai Context */}
          <div className="md:col-span-1">
            <h4 className="text-xs font-bold text-slate-600 mb-2">Terai Region Context · तराई सन्दर्भ</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex gap-2">
                <span>🌾</span>
                <span>Terai contributes ~65% of Nepal's agricultural output. Paddy, maize, jute, and sugarcane are major crops.</span>
              </li>
              <li className="flex gap-2">
                <span>🏘️</span>
                <span>Grameen Bank group-lending model is more feasible in Terai due to better infrastructure and market access than hilly regions.</span>
              </li>
              <li className="flex gap-2">
                <span>📊</span>
                <span>51% of Terai households have at least one bank account vs 44% in hills/mountains (World Bank, 2014).</span>
              </li>
              <li className="flex gap-2">
                <span>🌿</span>
                <span>Tharu, Madhesi, and other indigenous communities in Terai are primary targets of NRB's deprived sector lending mandate.</span>
              </li>
              <li className="flex gap-2">
                <span>⚠️</span>
                <span>Informal moneylender rates in rural Terai can reach 24–60%+ annually. Financial literacy programs aim to reduce exploitation.</span>
              </li>
            </ul>
          </div>

          {/* Compound Interest Explained */}
          <div className="md:col-span-1">
            <h4 className="text-xs font-bold text-slate-600 mb-2">How Compound Interest Works · चक्रवृद्धि ब्याज</h4>
            <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs mb-2">
              <p className="text-slate-500">Formula:</p>
              <p className="text-slate-800 font-bold">A = P × (1 + r/n)^(n×t)</p>
              <div className="mt-2 space-y-0.5 text-slate-500">
                <p><strong>P</strong> = Principal</p>
                <p><strong>r</strong> = Annual rate (decimal)</p>
                <p><strong>n</strong> = Compounds per year</p>
                <p><strong>t</strong> = Time in years</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs">
              <p className="text-slate-500">Effective Annual Rate:</p>
              <p className="text-slate-800 font-bold">EAR = (1 + r/n)^n − 1</p>
              <p className="text-slate-400 mt-1 font-sans">Monthly compounding at 12% → EAR = 12.68%</p>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <p>Nepal uses <strong>Bikram Sambat (BS)</strong> calendar. Nepali banks calculate interest based on BS dates. This calculator uses Gregorian dates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── All Loan Type Details ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">All Terai Loan Types — Detailed Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {LOAN_TYPES.map((lt) => (
            <div key={lt.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{lt.icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-700">{lt.label}</p>
                  <p className="text-xs text-slate-400">{lt.labelNp}</p>
                </div>
                <span
                  className="ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-lg text-white"
                  style={{ backgroundColor: lt.color }}
                >
                  {lt.minRate === lt.maxRate ? `${lt.minRate}%` : `${lt.minRate}–${lt.maxRate}%`}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-2">{lt.description}</p>
              <p className="text-xs text-slate-400 italic">{lt.institution}</p>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-2">{lt.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-700">
          <strong>Disclaimer:</strong> This calculator is for educational purposes. Interest rates are based on Nepal Rastra Bank (NRB) guidelines and publicly available data as of 2025. Actual rates vary by institution, borrower profile, and NRB monetary policy. Always verify current rates with your lender. Agricultural subsidy rates are subject to government programme availability.
        </p>
      </div>

    </div>
  )
}
