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

// Custom tooltip for NPR formatting
function NprTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatNPR(entry.value)}
        </p>
      ))}
    </div>
  )
}

// Pie chart: Distribution by lender type
function LenderTypePie({ loans }) {
  const active = loans.filter((l) => l.isActive)
  const byType = {}
  active.forEach((loan) => {
    const t = loan.lenderType
    byType[t] = (byType[t] || 0) + (parseFloat(loan.principal) || 0)
  })
  const data = Object.entries(byType).map(([type, value]) => ({
    name: TYPE_LABELS[type] || type,
    value,
    type,
  }))

  if (!data.length) return <EmptyState />

  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
    if (percent < 0.05) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {(percent * 100).toFixed(0)}%
      </text>
    )
  }

  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={90}
            innerRadius={35}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={TYPE_COLORS[entry.type] || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => formatNPR(val)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
          />
          <Legend
            formatter={(value) => <span style={{ fontSize: '12px', color: '#475569' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Bar chart: Principal vs Interest per loan
function PrincipalInterestBar({ loans }) {
  const active = loans.filter((l) => l.isActive)
  const data = active.map((loan) => {
    const { interest } = calculateLoanMetrics(loan)
    return {
      name:
        loan.lenderName.length > 12
          ? loan.lenderName.slice(0, 11) + '…'
          : loan.lenderName,
      principal: parseFloat(loan.principal) || 0,
      interest,
    }
  })

  if (!data.length) return <EmptyState />

  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
          <Tooltip content={<NprTooltip />} />
          <Legend formatter={(value) => <span style={{ fontSize: '12px', color: '#475569' }}>{value}</span>} />
          <Bar dataKey="principal" name="Principal" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="interest" name="Interest" fill="#c8102e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Area chart: 12-month interest growth projection (top 3 loans)
function InterestProjection({ loans }) {
  const active = loans.filter((l) => l.isActive).slice(0, 4)
  if (!active.length) return <EmptyState />

  // Build combined dataset
  const months = 12
  const projections = active.map((loan) => projectMonthly(loan, months))
  const labels = projections[0].map((p) => p.month)

  const data = labels.map((label, i) => {
    const row = { month: label }
    active.forEach((loan, j) => {
      const name =
        loan.lenderName.length > 10
          ? loan.lenderName.slice(0, 9) + '…'
          : loan.lenderName
      row[name] = projections[j][i].outstanding
    })
    return row
  })

  const keys = active.map((loan) =>
    loan.lenderName.length > 10 ? loan.lenderName.slice(0, 9) + '…' : loan.lenderName
  )

  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          {keys.map((key, i) => (
            <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis tickFormatter={(v) => toLakh(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
        <Tooltip content={<NprTooltip />} />
        <Legend formatter={(value) => <span style={{ fontSize: '12px', color: '#475569' }}>{value}</span>} />
        {keys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${i})`} strokeWidth={2}
          />
        ))}
      </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      No active loans to display
    </div>
  )
}

export default function LoanCharts({ loans }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-4 sm:p-6">
        <h3 className="font-bold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-nepal-red inline-block shrink-0" />
          Loan Distribution by Source
        </h3>
        <LenderTypePie loans={loans} />
      </div>

      <div className="card p-4 sm:p-6">
        <h3 className="font-bold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-nepal-blue inline-block shrink-0" />
          Principal vs Interest Accrued
        </h3>
        <PrincipalInterestBar loans={loans} />
      </div>

      <div className="card p-4 sm:p-6 lg:col-span-2">
        <h3 className="font-bold text-slate-700 mb-1 flex items-center gap-2 text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0" />
          12-Month Outstanding Projection
        </h3>
        <p className="text-xs text-slate-400 mb-3 sm:mb-4">
          How much will each loan cost if not repaid (showing top 4 active loans)
        </p>
        <InterestProjection loans={loans} />
      </div>
    </div>
  )
}
