import { useState, useRef } from 'react'
import { X, Wifi, ChevronRight, ChevronLeft, ExternalLink, CheckCircle, Eye, EyeOff } from 'lucide-react'
import Sheet from './Sheet'

const STEPS = [
  { id: 1, title: 'Create Firebase Project', short: 'Project' },
  { id: 2, title: 'Enable Firestore Database', short: 'Database' },
  { id: 3, title: 'Get App Credentials', short: 'Credentials' },
  { id: 4, title: 'Enter Config & Family Code', short: 'Connect' },
]

const EMPTY_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

function NumberedList({ items }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-700">
          <span className="w-6 h-6 rounded-full bg-nepal-red text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Step1() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        Firebase is a free Google service. The free plan is more than enough for a family loan tracker.
      </div>
      <NumberedList
        items={[
          <>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline inline-flex items-center gap-1">console.firebase.google.com <ExternalLink className="w-3 h-3" aria-hidden="true" /></a></>,
          <>Click <strong>"Add project"</strong> (or "Create a project")</>,
          <>Name it <strong>"loan-tracker"</strong> (or anything you like)</>,
          <>Disable Google Analytics (optional) and click <strong>"Create project"</strong></>,
          <>Wait for it to be created, then click <strong>"Continue"</strong></>,
        ]}
      />
    </div>
  )
}

function Step2() {
  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
        Firestore is the database where all loan data will be stored and synced in real-time.
      </div>
      <NumberedList
        items={[
          <>In your Firebase project, click <strong>"Build"</strong> in the left sidebar, then <strong>"Firestore Database"</strong></>,
          <>Click <strong>"Create database"</strong></>,
          <>Choose <strong>"Start in test mode"</strong> — anyone with your family code can read/write</>,
          <>Select any location (choose <strong>asia-south1</strong> for Nepal — closest server)</>,
          <>Click <strong>"Enable"</strong> and wait for the database to be ready</>,
        ]}
      />
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
        <strong>Note:</strong> Test mode expires after 30 days. After that you can update Firestore security rules to keep it open for your family.
      </div>
    </div>
  )
}

function Step3() {
  return (
    <div className="space-y-4">
      <NumberedList
        items={[
          <>In Firebase console, click the <strong>gear icon ⚙️</strong> next to "Project Overview", then <strong>"Project settings"</strong></>,
          <>Scroll down to <strong>"Your apps"</strong> section</>,
          <>Click the <strong>web icon &lt;/&gt;</strong> to add a web app</>,
          <>Give it any nickname like <strong>"loan-tracker-web"</strong> and click <strong>"Register app"</strong></>,
          <>You will see a <code className="bg-slate-100 px-1 rounded">firebaseConfig</code> object — copy those values to the next step</>,
        ]}
      />
      <pre className="bg-slate-100 rounded-xl p-3 text-xs text-slate-600 font-mono overflow-x-auto">
{`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "loan-tracker-xxx.firebaseapp.com",
  projectId: "loan-tracker-xxx",
  storageBucket: "loan-tracker-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456...:web:abc123..."
}`}
      </pre>
    </div>
  )
}

function Step4({ config, setConfig, familyCode, setFamilyCode, onSubmit, error, submitting }) {
  const [showKeys, setShowKeys] = useState(false)
  const [pasteMessage, setPasteMessage] = useState('')
  const pasteTimer = useRef(null)

  const fields = [
    { key: 'apiKey',            label: 'API Key',            placeholder: 'AIzaSy...' },
    { key: 'authDomain',        label: 'Auth Domain',        placeholder: 'your-project.firebaseapp.com' },
    { key: 'projectId',         label: 'Project ID',         placeholder: 'your-project-id' },
    { key: 'storageBucket',     label: 'Storage Bucket',     placeholder: 'your-project.appspot.com' },
    { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
    { key: 'appId',             label: 'App ID',              placeholder: '1:123:web:abc...' },
  ]

  function handlePaste(e) {
    const text = e.clipboardData.getData('text')
    const matches = {
      apiKey:            text.match(/apiKey:\s*["']([^"']+)["']/)?.[1],
      authDomain:        text.match(/authDomain:\s*["']([^"']+)["']/)?.[1],
      projectId:         text.match(/projectId:\s*["']([^"']+)["']/)?.[1],
      storageBucket:     text.match(/storageBucket:\s*["']([^"']+)["']/)?.[1],
      messagingSenderId: text.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1],
      appId:             text.match(/appId:\s*["']([^"']+)["']/)?.[1],
    }
    const filled = Object.values(matches).filter(Boolean).length
    if (matches.apiKey && filled >= 2) {
      e.preventDefault()
      setConfig((prev) => {
        const next = { ...prev }
        Object.entries(matches).forEach(([k, v]) => { if (v) next[k] = v })
        return next
      })
      setPasteMessage(`Auto-filled ${filled} field${filled === 1 ? '' : 's'} from pasted config`)
      clearTimeout(pasteTimer.current)
      pasteTimer.current = setTimeout(() => setPasteMessage(''), 4000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
        <strong>Tip:</strong> Paste the entire <code>firebaseConfig</code> object into the API Key field — it auto-fills all fields!
      </div>

      <div aria-live="polite" className="sr-only">{pasteMessage}</div>
      {pasteMessage && (
        <div className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {pasteMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Firebase Configuration</span>
        <button
          type="button"
          onClick={() => setShowKeys((v) => !v)}
          aria-pressed={showKeys}
          className="text-xs text-slate-500 inline-flex items-center gap-1 hover:text-slate-700 px-2 py-1 min-h-[36px] rounded-lg"
        >
          {showKeys ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
          {showKeys ? 'Hide' : 'Show'} keys
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label htmlFor={`fb-${key}`} className="label text-xs">{label}</label>
            <input
              id={`fb-${key}`}
              className="input-field text-sm"
              type={showKeys ? 'text' : 'password'}
              placeholder={placeholder}
              value={config[key]}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="next"
              onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
              onPaste={key === 'apiKey' ? handlePaste : undefined}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label htmlFor="fb-family" className="label">
          Family Code *
          <span className="ml-1 text-slate-400 font-normal text-xs">(share this with your brother)</span>
        </label>
        <input
          id="fb-family"
          className="input-field"
          placeholder="e.g. kushwaha-family-2024"
          value={familyCode}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="done"
          onChange={(e) => setFamilyCode(
            e.target.value
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+/, ''),
          )}
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Both you and your brother must enter the <strong>exact same code</strong>. This is your shared data space.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" aria-hidden="true" />
            <span>Connect &amp; Sync</span>
          </>
        )}
      </button>
    </div>
  )
}

export default function SyncSetup({ onConnected, onSkip }) {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState(EMPTY_CONFIG)
  const [familyCode, setFamilyCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleConnect() {
    setError('')
    const missing = Object.entries(config).filter(([, v]) => !v.trim())
    if (missing.length) {
      setError('Please fill in all Firebase config fields.')
      return
    }
    if (!familyCode.trim()) {
      setError('Please enter a family code.')
      return
    }
    setSubmitting(true)
    try {
      await onConnected(config, familyCode.trim())
    } catch (err) {
      setError(err?.message || 'Connection failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open onClose={onSkip} size="xl" labelledBy="sync-setup-title">
      {() => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-blue-100 p-2 rounded-xl shrink-0">
                <Wifi className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="sync-setup-title" className="text-base sm:text-lg font-bold text-slate-800 truncate">
                  Set Up Cloud Sync
                </h2>
                <p className="text-xs text-slate-500 truncate">Share loan data across all devices</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              aria-label="Close cloud sync setup"
              className="icon-btn hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="px-5 sm:px-6 pt-4 shrink-0">
            <div className="flex items-center gap-1 flex-wrap">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 min-w-[44px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      step > s.id
                        ? 'bg-green-500 text-white'
                        : step === s.id
                        ? 'bg-nepal-red text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                    aria-label={
                      step > s.id ? `Step ${s.id} complete` : step === s.id ? `Step ${s.id} of ${STEPS.length}` : `Step ${s.id}`
                    }
                  >
                    {step > s.id ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : s.id}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${step > s.id ? 'bg-green-400' : 'bg-slate-100'}`} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-2">
              <span className="text-slate-400">Step {step} of {STEPS.length} ·</span>{' '}
              {STEPS[step - 1].title}
            </p>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && (
              <Step4
                config={config}
                setConfig={setConfig}
                familyCode={familyCode}
                setFamilyCode={setFamilyCode}
                onSubmit={handleConnect}
                error={error}
                submitting={submitting}
              />
            )}
          </div>

          {/* Navigation */}
          {step < 4 ? (
            <div className="shrink-0 flex gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-white">
              {step > 1 ? (
                <button onClick={() => setStep((s) => s - 1)} className="btn-secondary">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
                </button>
              ) : (
                <button onClick={onSkip} className="btn-secondary">
                  Skip
                </button>
              )}
              <button onClick={() => setStep((s) => s + 1)} className="btn-primary flex-1">
                Next <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-100 bg-white text-center">
              <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 underline px-2 py-1 min-h-[36px]">
                Skip for now — use offline mode
              </button>
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
