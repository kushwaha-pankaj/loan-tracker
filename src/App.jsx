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
import { PlusCircle, Trash2, Cloud, CloudOff, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import LoanCharts from './components/LoanCharts'
import LoanForm from './components/LoanForm'
import LoanTable from './components/LoanTable'
import SyncSetup from './components/SyncSetup'
import NepalTeraiCalculator from './components/NepalTeraiCalculator'
import Sheet from './components/Sheet'
import RecordPaymentSheet from './components/RecordPaymentSheet'
import { aggregateSummary, getSampleLoans, sortPayments } from './utils/calculations'
import {
  loadFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  initFirebase,
  teardownFirebase,
  getDb,
  DEFAULT_CONFIG,
  DEFAULT_FAMILY,
} from './firebase'

const MOBILE_TABS = [
  { id: 'dashboard', label: 'Home' },
  { id: 'loans', label: 'Loans' },
  { id: 'calculator', label: 'Calc' },
]

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

function stripUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined)
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[k] = stripUndefinedDeep(v)
    }
    return out
  }
  return value
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
  const Icon = {
    synced:  Cloud,
    syncing: Loader2,
    offline: CloudOff,
    error:   AlertCircle,
  }[status]
  const labels = {
    synced:  'Synced',
    syncing: 'Syncing…',
    offline: 'Offline mode',
    error:   'Sync error',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        aria-live="polite"
      >
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${styles[status]}`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{labels[status]}</span>
          {(status === 'synced' || status === 'syncing') && familyCode && (
            <span className="hidden xs:inline opacity-80">·</span>
          )}
          {(status === 'synced' || status === 'syncing') && familyCode && (
            <span className="hidden xs:inline max-w-[10rem] truncate">{familyCode}</span>
          )}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {status === 'offline' && (
            <button
              onClick={onSetup}
              className="text-xs text-nepal-red font-semibold hover:underline px-2 py-1 min-h-[32px]"
            >
              Enable cloud sync →
            </button>
          )}
          {status === 'error' && (
            <>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 text-xs text-nepal-red font-semibold hover:underline px-2 py-1 min-h-[32px]"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" /> Retry
              </button>
              <button
                onClick={onSetup}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline px-2 py-1 min-h-[32px]"
              >
                Edit settings
              </button>
              <button
                onClick={onDisconnect}
                className="text-xs text-slate-400 hover:text-slate-600 hover:underline px-2 py-1 min-h-[32px]"
              >
                Disconnect
              </button>
            </>
          )}
          {(status === 'synced' || status === 'syncing') && (
            <button
              onClick={onDisconnect}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline px-2 py-1 min-h-[32px]"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      {status === 'error' && syncError && (
        <p
          role="alert"
          className="text-xs text-red-600 mt-1.5 break-words"
        >
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
  const [paymentForLoan, setPaymentForLoan] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState('offline') // offline | syncing | synced | error
  const [syncError, setSyncError]   = useState(null)
  const [familyCode, setFamilyCode] = useState(lsFamily)
  const unsubRef = useRef(null)

  // ── Connect on mount — use saved config or baked-in defaults ─────────────────
  useEffect(() => {
    const cfg = loadFirebaseConfig() ?? DEFAULT_CONFIG
    const fc  = lsFamily() || DEFAULT_FAMILY
    connectFirestore(cfg, fc)
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
    const cfg = loadFirebaseConfig() ?? DEFAULT_CONFIG
    const fc  = familyCode || lsFamily() || DEFAULT_FAMILY
    connectFirestore(cfg, fc)
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
    const cleanLoan = stripUndefinedDeep(loan)
    fallbackSave(cleanLoan)
    if (syncStatus !== 'offline' && familyCode) {
      try {
        await setDoc(doc(loansCol(familyCode), cleanLoan.id), cleanLoan)
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
    fallbackDelete(id)
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

  const savePaymentToLoan = useCallback(
    async (payment) => {
      const loan = paymentForLoan
      if (!loan) return
      setPaymentBusy(true)
      try {
        const next = sortPayments([...(loan.payments || []), payment])
        await saveLoan({ ...loan, payments: next })
        setPaymentForLoan(null)
      } finally {
        setPaymentBusy(false)
      }
    },
    [paymentForLoan, saveLoan],
  )

  const summary = aggregateSummary(loans)
  const anySheetOpen = showForm || !!deleteConfirm || showSyncSetup || !!paymentForLoan

  return (
    <div className="min-h-screen-d bg-slate-50 flex flex-col">
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

      <main
        id="main"
        className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] sm:pb-8"
      >
        <SummaryCards summary={summary} />

        {activeTab === 'dashboard' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">Overview Charts</h2>
              <p className="text-xs text-slate-400 hidden xs:block">
                As of{' '}
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <LoanCharts loans={loans} onAddLoan={openAdd} />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-700">Active Loans</h2>
                <button
                  onClick={() => setActiveTab('loans')}
                  className="text-sm text-nepal-red font-medium hover:underline px-2 py-1 min-h-[32px]"
                >
                  View all →
                </button>
              </div>
              <LoanTable
                loans={loans.filter((l) => l.isActive)}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
                onToggle={toggleLoan}
                onAddLoan={openAdd}
                onRecordPayment={setPaymentForLoan}
                onSaveLoan={saveLoan}
              />
            </div>
          </>
        )}

        {activeTab === 'loans' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-700">All Loans ({loans.length})</h2>
              <button onClick={openAdd} className="hidden sm:inline-flex btn-primary text-sm">
                <PlusCircle className="w-4 h-4" aria-hidden="true" /> Add Loan
              </button>
            </div>
            <LoanTable
              loans={loans}
              onEdit={openEdit}
              onDelete={setDeleteConfirm}
              onToggle={toggleLoan}
              onAddLoan={openAdd}
              onRecordPayment={setPaymentForLoan}
              onSaveLoan={saveLoan}
            />
          </>
        )}

        {activeTab === 'calculator' && <NepalTeraiCalculator />}
      </main>

      <footer className="py-5 border-t border-slate-200 text-center text-[11px] sm:text-xs text-slate-400 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <p className="px-3">
          Loan Tracker Nepal ·{' '}
          {syncStatus === 'offline'
            ? 'Stored locally on this device'
            : `Synced via Firebase · ${familyCode}`}
        </p>
        <p className="hidden sm:block mt-1">परिवार ऋण व्यवस्थापन · Family Loan Management</p>
      </footer>

      {/* Mobile bottom app-style navigation */}
      <nav
        aria-label="Bottom navigation"
        className="sm:hidden fixed left-0 right-0 bottom-0 z-header px-3 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2"
      >
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg">
          <div className="grid grid-cols-3 gap-1 p-1.5">
            {MOBILE_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'min-h-[48px] rounded-xl text-sm font-semibold transition-[transform,colors] duration-220 ease-ios active:scale-[0.97]',
                    isActive
                      ? 'bg-nepal-blue text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile FAB — only on phones, hidden when any sheet is open */}
      {!anySheetOpen && (
        <button
          onClick={openAdd}
          aria-label="Add a new loan"
          className="sm:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]
                     z-fab w-14 h-14 rounded-full bg-nepal-red text-white shadow-fab
                     flex items-center justify-center
                     transition-transform duration-220 ease-ios active:scale-90
                     focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2
                     focus-visible:ring-offset-nepal-red"
        >
          <PlusCircle className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}

      {/* Modals (sheets) */}
      {showForm && <LoanForm loan={editingLoan} onSave={saveLoan} onClose={closeForm} />}

      {paymentForLoan && (
        <RecordPaymentSheet
          key={paymentForLoan.id}
          loan={paymentForLoan}
          onClose={() => {
            if (!paymentBusy) setPaymentForLoan(null)
          }}
          onSave={savePaymentToLoan}
          busy={paymentBusy}
        />
      )}

      <Sheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        size="sm"
      >
        {({ titleId }) => (
          <>
            <div className="px-6 pt-5 pb-2 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 id={titleId} className="text-lg font-bold text-slate-800">
                Delete this loan?
              </h3>
              <p className="text-slate-500 text-sm mt-2">
                This cannot be undone. The record will be removed for all family members.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-5 pt-3 border-t border-slate-100 bg-white">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteLoan(deleteConfirm)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-xl transition-[transform,colors] duration-220 ease-ios active:scale-[0.97] min-h-[48px]"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
              </button>
            </div>
          </>
        )}
      </Sheet>

      {showSyncSetup && (
        <SyncSetup
          onConnected={handleSyncConnected}
          onSkip={() => setShowSyncSetup(false)}
        />
      )}
    </div>
  )
}
