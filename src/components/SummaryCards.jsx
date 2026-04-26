import { formatNPR, toLakh } from '../utils/calculations'
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, Banknote } from 'lucide-react'

function Card({ icon: Icon, iconBg, title, value, sub, border }) {
  return (
    <div className={`card p-3 xs:p-4 sm:p-5 border-l-4 ${border} min-w-0`}>
      <div className="flex items-start justify-between gap-1.5 xs:gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] xs:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 leading-tight">
            {title}
          </p>
          <p className="text-[clamp(1.35rem,4.2vw,1.75rem)] sm:text-2xl font-extrabold text-slate-800 currency leading-tight">
            {value}
          </p>
          <p className="text-[11px] xs:text-xs text-slate-500 mt-1 font-medium leading-tight">{sub}</p>
        </div>
        <div className={`p-1.5 xs:p-2 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 ${iconBg}`}>
          <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ summary }) {
  const { totalPrincipal, totalInterest, totalOutstanding, totalPaid, activeCount, totalCount } = summary
  const paid = totalPaid != null ? totalPaid : 0
  const interestRatio =
    totalPrincipal > 0 ? ((totalInterest / totalPrincipal) * 100).toFixed(1) : 0

  return (
    <div className="grid max-[360px]:grid-cols-1 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 xs:gap-3 sm:gap-4">
      <Card
        icon={DollarSign}
        iconBg="bg-blue-100 text-blue-600"
        title="Total borrowed"
        value={formatNPR(totalPrincipal)}
        sub={`${toLakh(totalPrincipal)} at start`}
        border="border-blue-400"
      />
      <Card
        icon={Banknote}
        iconBg="bg-emerald-100 text-emerald-700"
        title="Total paid"
        value={formatNPR(paid)}
        sub="Recorded repayments"
        border="border-emerald-400"
      />
      <Card
        icon={TrendingUp}
        iconBg="bg-orange-100 text-orange-600"
        title="Byaj owed (now)"
        value={formatNPR(totalInterest)}
        sub={totalPrincipal > 0 ? `≈ ${interestRatio}% of borrowed` : '—'}
        border="border-orange-400"
      />
      <Card
        icon={AlertCircle}
        iconBg="bg-red-100 text-red-600"
        title="Total due (now)"
        value={formatNPR(totalOutstanding)}
        sub={`${toLakh(totalOutstanding)} to settle`}
        border="border-red-400"
      />
      <Card
        icon={CheckCircle}
        iconBg="bg-green-100 text-green-600"
        title="Active loans"
        value={String(activeCount)}
        sub={`${totalCount - activeCount} paid / closed`}
        border="border-green-400"
      />
    </div>
  )
}
