import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const APP_NAME = 'loan-tracker'
const CONFIG_KEY = 'nepal-loan-tracker-firebase-config'

export const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyDAkYfo2kfzEYnnHgpz3bPIWaeJHsXhEHM',
  authDomain: 'loan-tracker-6abc0.firebaseapp.com',
  projectId: 'loan-tracker-6abc0',
  storageBucket: 'loan-tracker-6abc0.firebasestorage.app',
  messagingSenderId: '1064024752753',
  appId: '1:1064024752753:web:f6657684c406a8082911d0',
}
export const DEFAULT_FAMILY = 'kushwaha-family'

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
    const existing = getApps().find((a) => a.name === APP_NAME)
    _app = existing || initializeApp(config, APP_NAME)
    _db = getFirestore(_app)
    return { db: _db, error: null }
  } catch (err) {
    console.error('[firebase] init failed', err)
    return { db: null, error: err?.message || 'Firebase initialization failed' }
  }
}

export async function teardownFirebase() {
  try {
    if (_app) await deleteApp(_app)
  } catch (err) {
    console.warn('[firebase] teardown warning', err)
  } finally {
    _app = null
    _db = null
  }
}

export function getDb() {
  return _db
}
