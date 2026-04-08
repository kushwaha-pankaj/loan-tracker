import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import LoanCharts from './components/LoanCharts'
import LoanForm from './components/LoanForm'
import LoanTable from './components/LoanTable'
import SyncSetup from './components/SyncSetup'
import NepalTeraiCalculator from './components/NepalTeraiCalculator'
import { aggregateSummary, getSampleLoans } from './utils/calculations'
import {
  loadFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  initFirebase,
  getDb,
} from './firebase'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_LOANS = 'nepal-loan-tracker-v1'
const LS_FAMILY = 'nepal-loan-tracker-family-code'
const LS_SYNC   = 'nepal-loan-tracker-sync-dismissed'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_LOANS)) || getSampleLoans() }
  catch { return getSampleLoans() }
}
function lsSave(loans) {
  try { localStorage.setItem(LS_LOANS, JSON.stringify(loans)) } catch {}
}
function lsFamily() {
  return localStorage.getItem(LS_FAMILY) || ''
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
function loansCol(familyCode) {
  return collection(getDb(), 'families', familyCode, 'loans')
}

// ── Sync status badge ─────────────────────────────────────────────────────────
function SyncBadge({ status, familyCode, onSetup, onDisconnect }) {
  const styles = {
    synced:      'bg-green-100 text-green-700',
    syncing:     'bg-yellow-100 text-yellow-700',
    offline:     'bg-slate-100 text-slate-500',
    error:       'bg-red-100 text-red-600',
  }
  const labels = {
    synced:  `☁️ Synced · ${familyCode}`,
    syncing: '⏳ Syncing...',
    offline: '💾 Offline mode',
    error:   '⚠️ Sync error',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
      {status === 'offline' ? (
        <button onClick={onSetup} className="text-xs text-nepal-red font-semibold hover:underline">
          Enable cloud sync →
        </button>
      ) : (
        <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
          Disconnect
        </button>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loans, setLoans]           = useState(lsLoad)
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [showForm, setShowForm]     = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showSyncSetup, setShowSyncSetup] = useState(false)
  const [syncStatus, setSyncStatus] = useState('offline') // offline | syncing | synced | error
  const [familyCode, setFamilyCode] = useState(lsFamily)
  const unsubRef = useRef(null)

  // ── Try to connect on mount if config exists ────────────────────────────────
  useEffect(() => {
    const cfg = loadFirebaseConfig()
    const fc  = lsFamily()
    if (cfg && fc) {
      connectFirestore(cfg, fc)
    }
  }, []) // eslint-disable-line

  function connectFirestore(config, fc) {
    const { db, error } = initFirebase(config)
    if (error) {
      setSyncStatus('error')
      return
    }
    setSyncStatus('syncing')
    setFamilyCode(fc)
    localStorage.setItem(LS_FAMILY, fc)

    // Real-time listener
    const unsub = onSnapshot(
      loansCol(fc),
      (snap) => {
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setLoans(remote)
        lsSave(remote)
        setSyncStatus('synced')
      },
      () => setSyncStatus('error')
    )
    unsubRef.current = unsub
  }

  // Migrate any existing localStorage loans to Firestore on first connect
  async function handleSyncConnected(config, fc) {
    saveFirebaseConfig(config)
    localStorage.setItem(LS_FAMILY, fc)

    const { db, error } = initFirebase(config)
    if (error) {
      setSyncStatus('error')
      setShowSyncSetup(false)
      return
    }

    setSyncStatus('syncing')
    setFamilyCode(fc)
    setShowSyncSetup(false)

    // Push existing local loans up if Firestore is empty
    try {
      const existing = await getDocs(loansCol(fc))
      if (existing.empty && loans.length > 0) {
        const batch = writeBatch(db)
        loans.forEach((loan) => {
          batch.set(doc(loansCol(fc), loan.id), loan)
        })
        await batch.commit()
      }
    } catch {}

    // Start real-time listener
    const unsub = onSnapshot(
      loansCol(fc),
      (snap) => {
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setLoans(remote)
        lsSave(remote)
        setSyncStatus('synced')
      },
      () => setSyncStatus('error')
    )
    unsubRef.current = unsub
  }

  function handleDisconnect() {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    clearFirebaseConfig()
    localStorage.removeItem(LS_FAMILY)
    setFamilyCode('')
    setSyncStatus('offline')
    setLoans(lsLoad())
  }

  // ── CRUD — write to Firestore if connected, else localStorage ──────────────
  const saveLoan = useCallback(async (loan) => {
    if (syncStatus !== 'offline' && familyCode) {
      try {
        await setDoc(doc(loansCol(familyCode), loan.id), loan)
        // onSnapshot will update state
      } catch { fallbackSave(loan) }
    } else {
      fallbackSave(loan)
    }
  }, [syncStatus, familyCode]) // eslint-disable-line

  function fallbackSave(loan) {
    setLoans((prev) => {
      const next = prev.find((l) => l.id === loan.id)
        ? prev.map((l) => (l.id === loan.id ? loan : l))
        : [...prev, loan]
      lsSave(next)
      return next
    })
  }

  const deleteLoan = useCallback(async (id) => {
    if (syncStatus !== 'offline' && familyCode) {
      try {
        await deleteDoc(doc(loansCol(familyCode), id))
      } catch { fallbackDelete(id) }
    } else {
      fallbackDelete(id)
    }
    setDeleteConfirm(null)
  }, [syncStatus, familyCode]) // eslint-disable-line

  function fallbackDelete(id) {
    setLoans((prev) => { const next = prev.filter((l) => l.id !== id); lsSave(next); return next })
  }

  const toggleLoan = useCallback(async (id) => {
    const loan = loans.find((l) => l.id === id)
    if (!loan) return
    const updated = { ...loan, isActive: !loan.isActive }
    await saveLoan(updated)
  }, [loans, saveLoan])

  // ── Offline-mode: keep localStorage in sync ─────────────────────────────────
  useEffect(() => {
    if (syncStatus === 'offline') lsSave(loans)
  }, [loans, syncStatus])

  // ── UI handlers ─────────────────────────────────────────────────────────────
  const openAdd  = useCallback(() => { setEditingLoan(null); setShowForm(true) }, [])
  const openEdit = useCallback((loan) => { setEditingLoan(loan); setShowForm(true) }, [])
  const closeForm = useCallback(() => { setShowForm(false); setEditingLoan(null) }, [])

  const summary = aggregateSummary(loans)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} onAddLoan={openAdd} />

      {/* Sync status bar */}
      <div className="bg-white border-b border-slate-100">
        <SyncBadge
          status={syncStatus}
          familyCode={familyCode}
          onSetup={() => setShowSyncSetup(true)}
          onDisconnect={handleDisconnect}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SummaryCards summary={summary} />

        {activeTab === 'dashboard' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">Overview Charts</h2>
              <p className="text-xs text-slate-400">
                Auto-calculated as of{' '}
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <LoanCharts loans={loans} />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-700">Active Loans</h2>
                <button onClick={() => setActiveTab('loans')} className="text-sm text-nepal-red font-medium hover:underline">
                  View all →
                </button>
              </div>
              <LoanTable
                loans={loans.filter((l) => l.isActive)}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
                onToggle={toggleLoan}
                onAddLoan={openAdd}
              />
            </div>
          </>
        )}

        {activeTab === 'loans' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">All Loans ({loans.length})</h2>
              <button onClick={openAdd} className="btn-primary text-sm">+ Add Loan</button>
            </div>
            <LoanTable
              loans={loans}
              onEdit={openEdit}
              onDelete={setDeleteConfirm}
              onToggle={toggleLoan}
              onAddLoan={openAdd}
            />
          </>
        )}

        {activeTab === 'calculator' && <NepalTeraiCalculator />}
      </main>

      <footer className="mt-12 py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>Loan Tracker Nepal — {syncStatus === 'offline' ? 'Data stored locally in your browser' : `Synced via Firebase · Family: ${familyCode}`}</p>
        <p className="mt-1">परिवार ऋण व्यवस्थापन · Family Loan Management</p>
      </footer>

      {/* Modals */}
      {showForm && <LoanForm loan={editingLoan} onSave={saveLoan} onClose={closeForm} />}

      {deleteConfirm && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-content bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-lg font-bold text-slate-800">Delete Loan?</h3>
            <p className="text-slate-500 text-sm mt-2">This cannot be undone. The record will be removed for all family members.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={() => deleteLoan(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center justify-center active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncSetup && (
        <SyncSetup
          onConnected={handleSyncConnected}
          onSkip={() => setShowSyncSetup(false)}
        />
      )}
    </div>
  )
}
