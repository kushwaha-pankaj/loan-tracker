import { PlusCircle, TrendingUp } from 'lucide-react'

export default function Header({ activeTab, setActiveTab, onAddLoan }) {
  return (
    <header className="bg-nepal-blue shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-nepal-red/20 p-2 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Loan Tracker</h1>
              <p className="text-blue-200 text-xs font-medium">परिवार ऋण व्यवस्थापन · Nepal</p>
            </div>
          </div>
          <button onClick={onAddLoan} className="btn-primary bg-nepal-red hover:bg-red-600 text-sm">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Add Loan</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 pb-0">
          {['dashboard', 'loans'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-200 capitalize ${
                activeTab === tab
                  ? 'bg-slate-50 text-nepal-blue'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'dashboard' ? '📊 Dashboard' : '📋 All Loans'}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
