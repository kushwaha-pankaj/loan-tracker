import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import LoanCharts from './components/LoanCharts'
import LoanForm from './components/LoanForm'
import LoanTable from './components/LoanTable'
import { aggregateSummary, getSampleLoans } from './utils/calculations'

const STORAGE_KEY = 'nepal-loan-tracker-v1'

function loadLoans() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  // First time: load sample data
  return getSampleLoans()
}

function saveLoans(loans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))
  } catch {
    // ignore
  }
}

export default function App() {
  const [loans, setLoans] = useState(loadLoans)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // id to confirm delete

  // Persist on change
  useEffect(() => {
    saveLoans(loans)
  }, [loans])

  const handleSave = useCallback((loan) => {
    setLoans((prev) => {
      const exists = prev.find((l) => l.id === loan.id)
      if (exists) return prev.map((l) => (l.id === loan.id ? loan : l))
      return [...prev, loan]
    })
  }, [])

  const handleEdit = useCallback((loan) => {
    setEditingLoan(loan)
    setShowForm(true)
  }, [])

  const handleDelete = useCallback((id) => {
    setDeleteConfirm(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      setLoans((prev) => prev.filter((l) => l.id !== deleteConfirm))
      setDeleteConfirm(null)
    }
  }, [deleteConfirm])

  const handleToggle = useCallback((id) => {
    setLoans((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isActive: !l.isActive } : l))
    )
  }, [])

  const openAddForm = useCallback(() => {
    setEditingLoan(null)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingLoan(null)
  }, [])

  const summary = aggregateSummary(loans)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} onAddLoan={openAddForm} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Always visible summary cards */}
        <SummaryCards summary={summary} />

        {activeTab === 'dashboard' && (
          <>
            {/* Last updated */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">Overview Charts</h2>
              <p className="text-xs text-slate-400">
                Auto-calculated as of{' '}
                {new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <LoanCharts loans={loans} />

            {/* Quick preview of active loans */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-700">Active Loans Summary</h2>
                <button
                  onClick={() => setActiveTab('loans')}
                  className="text-sm text-nepal-red font-medium hover:underline"
                >
                  View all →
                </button>
              </div>
              <LoanTable
                loans={loans.filter((l) => l.isActive)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onAddLoan={openAddForm}
              />
            </div>
          </>
        )}

        {activeTab === 'loans' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">
                All Loans ({loans.length})
              </h2>
              <button onClick={openAddForm} className="btn-primary text-sm">
                + Add Loan
              </button>
            </div>
            <LoanTable
              loans={loans}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onAddLoan={openAddForm}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>Loan Tracker Nepal — All data stored locally in your browser</p>
        <p className="mt-1">Built for family loan management · परिवार ऋण व्यवस्थापन</p>
      </footer>

      {/* Loan form modal */}
      {showForm && (
        <LoanForm loan={editingLoan} onSave={handleSave} onClose={closeForm} />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-content bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="text-lg font-bold text-slate-800">Delete Loan?</h3>
              <p className="text-slate-500 text-sm mt-2">
                This action cannot be undone. The loan record will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
