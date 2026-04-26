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
  teardownFirebase,
  getDb,
} from './firebase'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_LOANS = 'nepal-loan-tracker-v1'
const LS_FAMILY = 'nepal-loan-tracker-family-code'

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
function SyncBadge({ status, familyCode, syncError, onSetup, onRetry, onDisconnect }) {
  const styles = {
    synced:  'bg-green-100 text-green-700',
    syncing: 'bg-yellow-100 text-yellow-700',
    offline: 'bg-slate-100 text-slate-500',
    error:   'bg-red-100 text-red-600',
  }
  const labels = {
    synced:  `☁️ Synced · ${familyCode}`,
    syncing: '⏳ Syncing...',
    offline: '💾 Offline mode',
    error:   '⚠️ Sync error',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[status]}`}>
          {labels[status]}
        </span>
        <div className="flex items-center gap-3">
          {status === 'offline' && (
            <button onClick={onSetup} className="text-xs text-nepal-red font-semibold hover:underline">
              Enable cloud sync →
            </button>
          )}
          {status === 'error' && (
            <>
              <button onClick={onRetry} className="text-xs text-nepal-red font-semibold hover:underline">
                Retry
              </button>
              <button onClick={onSetup} className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                Edit settings
              </button>
              <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
                Disconnect
              </button>
            </>
          )}
          {(status === 'synced' || status === 'syncing') && (
            <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
              Disconnect
            </button>
          )}
        </div>
      </div>
      {status === 'error' && syncError && (
        <p className="text-xs text-red-600 mt-1.5 break-words">
          <span className="font-semibold">Details:</span> {syncError}
        </p>
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
  const [syncError, setSyncError]   = useState(null)
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

  function reportError(prefix, err) {
    const msg = err?.message || String(err) || 'Unknown error'
    console.error(`[firestore] ${prefix}:`, err)
    setSyncError(`${prefix}: ${msg}`)
    setSyncStatus('error')
  }

  function subscribeLoans(fc) {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    unsubRef.current = onSnapshot(
      loansCol(fc),
      (snap) => {
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setLoans(remote)
        lsSave(remote)
        setSyncStatus('synced')
        setSyncError(null)
      },
      (err) => reportError('Listener failed', err),
    )
  }

  function connectFirestore(config, fc) {
    setSyncError(null)
    const { error } = initFirebase(config)
    if (error) {
      reportError('Init failed', new Error(error))
      return
    }
    setSyncStatus('syncing')
    setFamilyCode(fc)
    localStorage.setItem(LS_FAMILY, fc)
    try {
      subscribeLoans(fc)
    } catch (err) {
      reportError('Subscribe failed', err)
    }
  }

  // Migrate existing localStorage loans to Firestore on first connect
  async function handleSyncConnected(config, fc) {
    setSyncError(null)
    saveFirebaseConfig(config)
    localStorage.setItem(LS_FAMILY, fc)

    const { db, error } = initFirebase(config)
    if (error) {
      reportError('Init failed', new Error(error))
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
    } catch (err) {
      reportError('Initial migration failed', err)
      return
    }

    try {
      subscribeLoans(fc)
    } catch (err) {
      reportError('Subscribe failed', err)
    }
  }

  function handleRetry() {
    const cfg = loadFirebaseConfig()
    const fc  = familyCode || lsFamily()
    if (cfg && fc) {
      connectFirestore(cfg, fc)
    } else {
      setShowSyncSetup(true)
    }
  }

  async function handleDisconnect() {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    await teardownFirebase()
    clearFirebaseConfig()
    localStorage.removeItem(LS_FAMILY)
    setFamilyCode('')
    setSyncError(null)
    setSyncStatus('offline')
    setLoans(lsLoad())
  }

  // ── CRUD — optimistic local update first, then Firestore write ─────────────
  const saveLoan = useCallback(async (loan) => {
    fallbackSave(loan) // optimistic
    if (syncStatus !== 'offline' && familyCode) {
      try {
        await setDoc(doc(loansCol(familyCode), loan.id), loan)
      } catch (err) {
        reportError('Save failed', err)
      }
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
    fallbackDelete(id) // optimistic
    setDeleteConfirm(null)
    if (syncStatus !== 'offline' && familyCode) {
      try {
        await deleteDoc(doc(loansCol(familyCode), id))
      } catch (err) {
        reportError('Delete failed', err)
      }
    }
  }, [syncStatus, familyCode]) // eslint-disable-line

  function fallbackDelete(id) {
    setLoans((prev) => { const next = prev.filter((l) => l.id !== id); lsSave(next); return next })
  }

  const toggleLoan = useCallback(async (id) => {
    const loan = loans.find((l) => l.id === id)
    if (!loan) return
    await saveLoan({ ...loan, isActive: !loan.isActive })
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
          syncError={syncError}
          onSetup={() => setShowSyncSetup(true)}
          onRetry={handleRetry}
          onDisconnect={handleDisconnect}
        />
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
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
