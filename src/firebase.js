import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const CONFIG_KEY = 'nepal-loan-tracker-firebase-config'

export function loadFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

let _db = null
let _app = null

export function initFirebase(config) {
  try {
    _app = initializeApp(config, 'loan-tracker')
    _db = getFirestore(_app)
    return { db: _db, error: null }
  } catch (err) {
    return { db: null, error: err.message }
  }
}

export function getDb() {
  return _db
}
