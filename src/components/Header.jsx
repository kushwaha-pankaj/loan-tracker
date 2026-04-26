import {
  PlusCircle,
  TrendingUp,
  LayoutDashboard,
  ClipboardList,
  Calculator,
} from 'lucide-react'

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  short: 'Home',   Icon: LayoutDashboard },
  { id: 'loans',      label: 'All Loans',  short: 'Loans',  Icon: ClipboardList   },
  { id: 'calculator', label: 'Calculator', short: 'Calc',   Icon: Calculator      },
]

export default function Header({ activeTab, setActiveTab, onAddLoan }) {
  return (
    <header
      className="bg-nepal-blue shadow-lg sticky top-0 z-header pt-[env(safe-area-inset-top)] no-select"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row */}
        <div className="flex items-center justify-between py-2.5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="bg-nepal-red/20 p-2 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white leading-tight truncate">
                Loan Tracker
              </h1>
              <p className="text-blue-200 text-[10px] sm:text-xs font-medium truncate">
                परिवार ऋण व्यवस्थापन · Nepal
              </p>
            </div>
          </div>

          {/* Add Loan button — hidden on phones (FAB takes over), visible sm+ */}
          <button
            onClick={onAddLoan}
            className="hidden sm:inline-flex btn-primary bg-nepal-red hover:bg-red-600 text-sm shrink-0"
            aria-label="Add a new loan"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Add Loan</span>
          </button>
        </div>

        {/* Tab navigation (desktop/tablet) */}
        <nav
          aria-label="Primary"
          className="hidden sm:flex gap-1 -mx-4 px-4 overflow-x-auto no-scrollbar scroll-snap-x"
        >
          {TABS.map(({ id, label, short, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveTab(id)}
                className={[
                  'snap-start shrink-0 inline-flex items-center gap-1.5',
                  'px-3 sm:px-5 py-2.5 min-h-[44px]',
                  'text-xs sm:text-sm font-semibold whitespace-nowrap',
                  'rounded-t-xl transition-[background-color,color,transform] duration-220 ease-ios',
                  active
                    ? 'bg-slate-50 text-nepal-blue shadow-sm'
                    : 'text-blue-200 hover:text-white hover:bg-white/10 active:scale-[0.97]',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 sm:w-4 sm:h-4" aria-hidden="true" strokeWidth={2.25} />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
