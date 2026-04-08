import { useState } from 'react'
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
} from 'lucide-react'
import { calculateLoanMetrics, formatNPR, riskLevel } from '../utils/calculations'
import { formatDateShort, formatDateBilingual } from '../utils/nepaliDate'

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

const RISK_STYLES = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-orange-600 bg-orange-50',
  low: 'text-green-600 bg-green-50',
}

const RISK_ICON = {
  high: <AlertTriangle className="w-3.5 h-3.5" />,
  medium: <Info className="w-3.5 h-3.5" />,
  low: <CheckCircle className="w-3.5 h-3.5" />,
}

function formatDate(dateStr) {
  return formatDateShort(dateStr)
}

function formatDateFull(dateStr) {
  return formatDateBilingual(dateStr)
}

function RateDisplay({ loan }) {
  const rate = parseFloat(loan.interestRate)
  const label = loan.rateType === 'monthly' ? `${rate}%/mo` : `${rate}%/yr`
  const annual = loan.rateType === 'monthly' ? rate * 12 : rate
  return (
    <div>
      <span className="font-semibold text-slate-700">{label}</span>
      {loan.rateType === 'monthly' && (
        <span className="text-slate-400 text-xs block">{annual}% p.a.</span>
      )}
      <span className="text-slate-400 text-xs capitalize">{loan.interestType}</span>
    </div>
  )
}

function LoanRow({ loan, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const metrics = calculateLoanMetrics(loan)
  const risk = riskLevel(loan)

  return (
    <>
      <tr
        className={`loan-row border-b border-slate-50 transition-colors ${
          !loan.isActive ? 'opacity-60' : ''
        }`}
      >
        {/* Lender */}
        <td className="px-4 py-3">
          <div className="font-semibold text-slate-800 text-sm">{loan.lenderName}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={TYPE_BADGE[loan.lenderType] || 'badge-person'}>
              {TYPE_LABEL[loan.lenderType] || loan.lenderType}
            </span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${RISK_STYLES[risk]}`}
            >
              {RISK_ICON[risk]}
              {risk}
            </span>
          </div>
        </td>

        {/* Borrower */}
        <td className="px-4 py-3">
          <div className="text-sm text-slate-700">{loan.borrowerName}</div>
          <div className="text-xs text-slate-400" title={loan.loanDate}>{formatDate(loan.loanDate)}</div>
        </td>

        {/* Age */}
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="text-sm font-medium text-slate-700">
            {metrics.monthsElapsed < 24
              ? `${metrics.monthsElapsed} mo`
              : `${(metrics.yearsElapsed).toFixed(1)} yr`}
          </div>
          <div className="text-xs text-slate-400">{metrics.daysElapsed} days</div>
        </td>

        {/* Principal */}
        <td className="px-4 py-3">
          <div className="text-sm font-semibold text-slate-800 currency">{formatNPR(loan.principal)}</div>
        </td>

        {/* Rate */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <RateDisplay loan={loan} />
        </td>

        {/* Interest */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="text-sm font-semibold text-orange-600 currency">{formatNPR(metrics.interest)}</div>
          <div className="text-xs text-slate-400">+{metrics.interestPercent}%</div>
        </td>

        {/* Outstanding */}
        <td className="px-4 py-3">
          <div className="text-sm font-bold text-red-600 currency">{formatNPR(metrics.total)}</div>
          <div className="text-xs text-slate-400">{formatNPR(metrics.dailyInterest)}/day</div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 hidden md:table-cell">
          <button
            onClick={() => onToggle(loan.id)}
            className={loan.isActive ? 'badge-active cursor-pointer' : 'badge-paid cursor-pointer'}
            title="Click to toggle status"
          >
            {loan.isActive ? '● Active' : '○ Paid'}
          </button>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              title="Details"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(loan)}
              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(loan.id)}
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded details row */}
      {expanded && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Loan Date (BS)</span>
                <p className="font-semibold text-slate-800">{formatDateFull(loan.loanDate)}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Annual Rate</span>
                <p className="font-semibold text-slate-800">{metrics.annualRate.toFixed(2)}% p.a.</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Monthly Rate</span>
                <p className="font-semibold text-slate-800">{metrics.monthlyRate.toFixed(3)}% p.m.</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Daily Interest</span>
                <p className="font-semibold text-slate-800">{formatNPR(metrics.dailyInterest)}/day</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs font-medium uppercase">Interest Type</span>
                <p className="font-semibold text-slate-800 capitalize">
                  {loan.interestType}
                  {loan.interestType === 'compound' ? ` (${loan.compoundFrequency})` : ''}
                </p>
              </div>
              {loan.notes && (
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-slate-500 text-xs font-medium uppercase">Notes</span>
                  <p className="text-slate-700">{loan.notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function LoanTable({ loans, onEdit, onDelete, onToggle, onAddLoan }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | active | paid
  const [sortBy, setSortBy] = useState('date') // date | principal | outstanding

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
      if (sortBy === 'principal')
        return (parseFloat(b.principal) || 0) - (parseFloat(a.principal) || 0)
      if (sortBy === 'outstanding') {
        const ma = calculateLoanMetrics(a)
        const mb = calculateLoanMetrics(b)
        return mb.total - ma.total
      }
      // Default: date (newest first)
      return new Date(b.loanDate) - new Date(a.loanDate)
    })

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search lender, borrower, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              className="input-field pl-8 text-sm pr-3 w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <select
            className="input-field text-sm w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort: Date</option>
            <option value="principal">Sort: Amount</option>
            <option value="outstanding">Sort: Outstanding</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Lender</th>
                <th className="px-4 py-3 text-left">Borrower</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Age</th>
                <th className="px-4 py-3 text-left">Principal</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Rate</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Interest</th>
                <th className="px-4 py-3 text-left">Outstanding</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
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
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-slate-600 font-semibold">No loans found</p>
          <p className="text-slate-400 text-sm mt-1">
            {loans.length === 0
              ? 'Add your first loan to get started'
              : 'Try adjusting search or filter'}
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
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
          <span>
            Showing {filtered.length} of {loans.length} loans
          </span>
          <span>Click row expand (▾) for details</span>
        </div>
      )}
    </div>
  )
}
