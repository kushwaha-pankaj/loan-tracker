import { formatNPR, toLakh } from '../utils/calculations'
import { TrendingUp, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'

function Card({ icon: Icon, iconBg, title, amount, sub, border }) {
  return (
    <div className={`card p-5 border-l-4 ${border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-extrabold text-slate-800 currency leading-tight truncate">
            {formatNPR(amount)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>
        </div>
        <div className={`p-3 rounded-2xl ml-3 flex-shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ summary }) {
  const { totalPrincipal, totalInterest, totalOutstanding, activeCount, totalCount } = summary

  const interestRatio =
    totalPrincipal > 0 ? ((totalInterest / totalPrincipal) * 100).toFixed(1) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={DollarSign}
        iconBg="bg-blue-100"
        title="Total Principal"
        amount={totalPrincipal}
        sub={`${toLakh(totalPrincipal)} borrowed`}
        border="border-blue-400"
      />
      <Card
        icon={TrendingUp}
        iconBg="bg-orange-100"
        title="Interest Accrued"
        amount={totalInterest}
        sub={`${interestRatio}% of principal`}
        border="border-orange-400"
      />
      <Card
        icon={AlertCircle}
        iconBg="bg-red-100"
        title="Total Outstanding"
        amount={totalOutstanding}
        sub={`${toLakh(totalOutstanding)} total due`}
        border="border-red-400"
      />
      <Card
        icon={CheckCircle}
        iconBg="bg-green-100"
        title="Active Loans"
        amount={activeCount}
        sub={`${totalCount - activeCount} paid / closed`}
        border="border-green-400"
      />
    </div>
  )
}
