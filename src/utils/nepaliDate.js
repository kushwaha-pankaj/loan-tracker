// ── Bikram Sambat ↔ Gregorian converter ──────────────────────────────────────
// Stores date internally as ISO string (AD). BS is only for display/entry.
//
// All date arithmetic delegates to ./bsCalendar.js — the single source of
// truth for BS month-length tables (covers 2000–2095). This module only
// preserves the display-name spellings and ISO-string helpers used by the
// loan form and table.

import {
  bsToAd as _bsToAd,
  adToBs as _adToBs,
  bsDaysInMonth,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
} from './bsCalendar'

export const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra',   'Ashwin', 'Kartik', 'Mangsir',
  'Poush',    'Magh',   'Falgun', 'Chaitra',
]

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ',   'असार',    'साउन',
  'भाद्र', 'असोज',  'कार्तिक', 'मंसिर',
  'पुस',   'माघ',   'फागुन',   'चैत',
]

export const BS_YEAR_RANGE = Array.from(
  { length: BS_MAX_YEAR - BS_MIN_YEAR + 1 },
  (_, i) => BS_MIN_YEAR + i,
)

/** Convert a Bikram Sambat date to a JS Date (UTC midnight) */
export function bsToAd(bsYear, bsMonth, bsDay) {
  return _bsToAd(bsYear, bsMonth, bsDay)
}

/** Convert a JS Date to Bikram Sambat { year, month, day } */
export function adToBs(adDate) {
  return _adToBs(adDate)
}

/** Convert AD ISO string "YYYY-MM-DD" to BS object */
export function isoToBs(isoStr) {
  if (!isoStr) return null
  const [y, m, d] = isoStr.split('-').map(Number)
  return _adToBs(new Date(y, m - 1, d))
}

/** Convert BS { year, month, day } to AD ISO string "YYYY-MM-DD" */
export function bsToIso(year, month, day) {
  const ad = _bsToAd(year, month, day)
  if (!ad) return ''
  // Use local-timezone components so the ISO string represents the same calendar day
  const y = ad.getFullYear()
  const m = String(ad.getMonth() + 1).padStart(2, '0')
  const d = String(ad.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Get number of days in a BS month */
export { bsDaysInMonth as bsMonthDays }

/** Format AD ISO string as "15 Baishakh 2082 BS" with AD fallback */
export function formatDateBilingual(isoStr) {
  if (!isoStr) return '—'
  const bs = isoToBs(isoStr)
  if (!bs) {
    const [y, m, d] = isoStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }
  return `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year} BS`
}

/** Short bilingual format for tables */
export function formatDateShort(isoStr) {
  if (!isoStr) return '—'
  const bs = isoToBs(isoStr)
  if (!bs) {
    const [y, m, d] = isoStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }
  return `${bs.day} ${BS_MONTHS[bs.month - 1].slice(0, 3)} ${bs.year}`
}
