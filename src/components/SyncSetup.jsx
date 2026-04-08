import { useState } from 'react'
import { X, Wifi, ChevronRight, ChevronLeft, ExternalLink, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Create Firebase Project' },
  { id: 2, title: 'Enable Firestore Database' },
  { id: 3, title: 'Get App Credentials' },
  { id: 4, title: 'Enter Config & Family Code' },
]

const EMPTY_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

function Step1() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        Firebase is a free Google service. The free plan is more than enough for a family loan tracker.
      </div>
      <ol className="space-y-3">
        {[
          <>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline inline-flex items-center gap-1">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a></>,
          <>Click <strong>"Add project"</strong> (or "Create a project")</>,
          <>Name it <strong>"loan-tracker"</strong> (or anything you like)</>,
          <>Disable Google Analytics (optional) and click <strong>"Create project"</strong></>,
          <>Wait for it to be created, then click <strong>"Continue"</strong></>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="w-6 h-6 rounded-full bg-nepal-red text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Step2() {
  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
        Firestore is the database where all loan data will be stored and synced in real-time.
      </div>
      <ol className="space-y-3">
        {[
          <>In your Firebase project, click <strong>"Build"</strong> in the left sidebar, then <strong>"Firestore Database"</strong></>,
          <>Click <strong>"Create database"</strong></>,
          <>Choose <strong>"Start in test mode"</strong> — this allows anyone with your family code to read/write</>,
          <>Select any location (choose <strong>asia-south1</strong> for Nepal — closest server)</>,
          <>Click <strong>"Enable"</strong> and wait for the database to be ready</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="w-6 h-6 rounded-full bg-nepal-red text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
        <strong>Note:</strong> Test mode expires after 30 days. After that you can update the security rules in Firestore to keep it open for your family.
      </div>
    </div>
  )
}

function Step3() {
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {[
          <>In Firebase console, click the <strong>gear icon ⚙️</strong> next to "Project Overview", then <strong>"Project settings"</strong></>,
          <>Scroll down to <strong>"Your apps"</strong> section</>,
          <>Click the <strong>web icon &lt;/&gt;</strong> to add a web app</>,
          <>Give it any nickname like <strong>"loan-tracker-web"</strong> and click <strong>"Register app"</strong></>,
          <>You will see a <code className="bg-slate-100 px-1 rounded">firebaseConfig</code> object — copy those values to the next step</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="w-6 h-6 rounded-full bg-nepal-red text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-600 font-mono">
        {`const firebaseConfig = {`}<br />
        {`  apiKey: "AIzaSy...",`}<br />
        {`  authDomain: "loan-tracker-xxx.firebaseapp.com",`}<br />
        {`  projectId: "loan-tracker-xxx",`}<br />
        {`  storageBucket: "loan-tracker-xxx.appspot.com",`}<br />
        {`  messagingSenderId: "123456789",`}<br />
        {`  appId: "1:123456...:web:abc123..."`}<br />
        {`}`}
      </div>
    </div>
  )
}

function Step4({ config, setConfig, familyCode, setFamilyCode, onSubmit, error }) {
  const [showKeys, setShowKeys] = useState(false)

  const fields = [
    { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...' },
    { key: 'authDomain', label: 'Auth Domain', placeholder: 'your-project.firebaseapp.com' },
    { key: 'projectId', label: 'Project ID', placeholder: 'your-project-id' },
    { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'your-project.appspot.com' },
    { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
    { key: 'appId', label: 'App ID', placeholder: '1:123:web:abc...' },
  ]

  // Try to parse a pasted config block
  function handlePaste(e) {
    const text = e.clipboardData.getData('text')
    // Try to extract key-value pairs from the config object
    const matches = {
      apiKey: text.match(/apiKey:\s*["']([^"']+)["']/)?.[1],
      authDomain: text.match(/authDomain:\s*["']([^"']+)["']/)?.[1],
      projectId: text.match(/projectId:\s*["']([^"']+)["']/)?.[1],
      storageBucket: text.match(/storageBucket:\s*["']([^"']+)["']/)?.[1],
      messagingSenderId: text.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1],
      appId: text.match(/appId:\s*["']([^"']+)["']/)?.[1],
    }
    if (matches.apiKey) {
      e.preventDefault()
      setConfig((prev) => {
        const next = { ...prev }
        Object.entries(matches).forEach(([k, v]) => { if (v) next[k] = v })
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
        <strong>Tip:</strong> You can paste the entire <code>firebaseConfig</code> object into the first field — it will auto-fill all fields!
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Firebase Configuration</span>
        <button
          type="button"
          onClick={() => setShowKeys((v) => !v)}
          className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-700"
        >
          {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showKeys ? 'Hide' : 'Show'} keys
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="label text-xs">{label}</label>
            <input
              className="input-field text-sm"
              type={showKeys ? 'text' : key === 'apiKey' ? 'text' : 'password'}
              placeholder={placeholder}
              value={config[key]}
              onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
              onPaste={key === 'apiKey' ? handlePaste : undefined}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label className="label">
          Family Code *
          <span className="ml-1 text-slate-400 font-normal text-xs">(share this with your brother)</span>
        </label>
        <input
          className="input-field"
          placeholder="e.g. kushwaha-family-2024"
          value={familyCode}
          onChange={(e) => setFamilyCode(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Both you and your brother must enter the <strong>exact same code</strong>. This is your shared data space.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        className="btn-primary w-full justify-center"
      >
        <Wifi className="w-4 h-4" />
        Connect & Sync
      </button>
    </div>
  )
}

export default function SyncSetup({ onConnected, onSkip }) {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState(EMPTY_CONFIG)
  const [familyCode, setFamilyCode] = useState('')
  const [error, setError] = useState('')

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
    onConnected(config, familyCode.trim())
  }

  return (
    <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Set Up Cloud Sync</h2>
              <p className="text-xs text-slate-500">Share loan data across all devices</p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    step > s.id
                      ? 'bg-green-500 text-white'
                      : step === s.id
                      ? 'bg-nepal-red text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${step > s.id ? 'bg-green-400' : 'bg-slate-100'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-2">{STEPS[step - 1].title}</p>
        </div>

        {/* Step content */}
        <div className="p-6">
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
            />
          )}
        </div>

        {/* Navigation */}
        {step < 4 && (
          <div className="px-6 pb-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary flex-1 justify-center">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Skip link */}
        <div className="pb-5 text-center">
          <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Skip for now — use offline mode
          </button>
        </div>
      </div>
    </div>
  )
}
