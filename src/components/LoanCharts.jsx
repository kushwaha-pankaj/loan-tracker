import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'
import { PlusCircle } from 'lucide-react'
import { calculateLoanMetrics, projectMonthly, formatNPR, toLakh } from '../utils/calculations'

const TYPE_COLORS = {
  person: '#8b5cf6',
  cooperative: '#10b981',
  bank: '#3b82f6',
  microfinance: '#f59e0b',
}

const TYPE_LABELS = {
  person: 'Person',
  cooperative: 'Cooperative',
  bank: 'Bank',
  microfinance: 'Microfinance',
}

const CHART_COLORS = ['#c8102e', '#1e3a5f', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

// Hook: track if viewport is < sm (640px) — drives responsive chart tweaks
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639.98px)').matches : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 639.98px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

// Custom tooltip for NPR formatting
function NprTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium currency">
          {entry.name}: {formatNPR(entry.value)}
        </p>
      ))}
    </div>
  )
}

function legendFormatter(fontSize) {
  return (value) => (
    <span style={{ fontSize: `${fontSize}px`, color: '#475569' }}>{value}</span>
  )
}

// ── Pie chart: Distribution by lender type ────────────────────────────────────
function LenderTypePie({ loans, isMobile }) {
  const active = loans.filter((l) => l.isActive)
  const byType = {}
  active.forEach((loan) => {
    const t = loan.lenderType
    const s = calculateLoanMetrics(loan)
    byType[t] = (byType[t] || 0) + s.totalOutstanding
  })
  const data = Object.entries(byType).map(([type, value]) => ({
    name: TYPE_LABELS[type] || type,
    value,
    type,
  }))

  if (!data.length) return <EmptyState message="No active loans to chart" />

  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={isMobile ? 10 : 11} fontWeight={600}>
        {(percent * 100).toFixed(0)}%
      </text>
    )
  }

  return (
    <div className="h-56 xs:h-60 sm:h-64 lg:h-72 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={isMobile ? 78 : 90}
            innerRadius={isMobile ? 30 : 35}
            dataKey="value"
            isAnimationActive={!isMobile}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={TYPE_COLORS[entry.type] || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => formatNPR(val)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
          />
          <Legend formatter={legendFormatter(isMobile ? 10 : 12)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Bar chart: Principal vs Interest per loan ─────────────────────────────────
function PrincipalInterestBar({ loans, isMobile }) {
  const active = loans.filter((l) => l.isActive)
  const data = active.map((loan) => {
    const s = calculateLoanMetrics(loan)
    const name = loan.lenderName || '—'
    return {
      name: name.length > 12 ? name.slice(0, 11) + '…' : name,
      principal: s.outstandingPrincipal,
      interest: s.interestOwed,
    }
  })

  if (!data.length) return <EmptyState message="No active loans to chart" />

  return (
    <div className="h-56 xs:h-60 sm:h-64 lg:h-72 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#64748b' }}
            interval={0}
            angle={isMobile ? -30 : 0}
            textAnchor={isMobile ? 'end' : 'middle'}
            height={isMobile ? 60 : 30}
          />
          <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
          <Tooltip content={<NprTooltip />} />
          <Legend formatter={legendFormatter(isMobile ? 10 : 12)} />
          <Bar dataKey="principal" name="Balance" fill="#1e3a5f" radius={[4, 4, 0, 0]} isAnimationActive={!isMobile} />
          <Bar dataKey="interest" name="Byaj" fill="#c8102e" radius={[4, 4, 0, 0]} isAnimationActive={!isMobile} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Area chart: 12-month projection (top 4 active loans) ──────────────────────
function InterestProjection({ loans, isMobile }) {
  const active = loans.filter((l) => l.isActive).slice(0, 4)
  if (!active.length) return <EmptyState message="Add an active loan to see future cost" />

  const months = 12
  const projections = active.map((loan) => projectMonthly(loan, months))
  const labels = projections[0].map((p) => p.month)

  const shortName = (loan) => {
    const n = loan.lenderName || '—'
    return n.length > 10 ? n.slice(0, 9) + '…' : n
  }

  const data = labels.map((label, i) => {
    const row = { month: label }
    active.forEach((loan, j) => {
      row[shortName(loan)] = projections[j][i].outstanding
    })
    return row
  })

  const keys = active.map(shortName)

  return (
    <div className="h-56 xs:h-60 sm:h-64 lg:h-72 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            {keys.map((key, i) => (
              <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#64748b' }}
            interval={isMobile ? 1 : 0}
          />
          <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
          <Tooltip content={<NprTooltip />} />
          <Legend formatter={legendFormatter(isMobile ? 10 : 12)} />
          {keys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={`url(#grad-${i})`}
              strokeWidth={2}
              isAnimationActive={!isMobile}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyState({ message = 'No active loans to display', cta }) {
  return (
    <div className="flex flex-col items-center justify-center h-56 sm:h-64 text-center px-4">
      <span aria-hidden="true" className="text-3xl mb-2">📊</span>
      <p className="text-slate-500 text-sm font-medium">{message}</p>
      {cta}
    </div>
  )
}

export default function LoanCharts({ loans, onAddLoan }) {
  const isMobile = useIsMobile()
  const hasActive = loans.some((l) => l.isActive)

  if (!hasActive) {
    return (
      <div className="card p-6 sm:p-8 text-center min-w-0">
        <span aria-hidden="true" className="text-4xl">📈</span>
        <h3 className="font-bold text-slate-700 mt-2">No active loans yet</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
          Add your first loan to see distribution, principal-vs-interest, and a 12-month projection chart.
        </p>
        {onAddLoan && (
          <button onClick={onAddLoan} className="btn-primary mt-4 mx-auto">
            <PlusCircle className="w-4 h-4" aria-hidden="true" /> Add your first loan
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div className="card p-4 sm:p-6 min-w-0">
        <h3 className="font-bold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-nepal-red inline-block shrink-0" aria-hidden="true" />
          Loan Distribution by Source
        </h3>
        <LenderTypePie loans={loans} isMobile={isMobile} />
      </div>

      <div className="card p-4 sm:p-6 min-w-0">
        <h3 className="font-bold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-nepal-blue inline-block shrink-0" aria-hidden="true" />
          Balance vs byaj (owed) per loan
        </h3>
        <PrincipalInterestBar loans={loans} isMobile={isMobile} />
      </div>

      <div className="card p-4 sm:p-6 lg:col-span-2 min-w-0">
        <h3 className="font-bold text-slate-700 mb-1 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0" aria-hidden="true" />
          12-Month Outstanding Projection
        </h3>
        <p className="text-xs text-slate-400 mb-3 sm:mb-4">
          How much will each loan cost if not repaid (showing top 4 active loans)
        </p>
        <InterestProjection loans={loans} isMobile={isMobile} />
      </div>
    </div>
  )
}
