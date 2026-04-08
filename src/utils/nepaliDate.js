// ── Bikram Sambat ↔ Gregorian converter ──────────────────────────────────────
// Stores date internally as ISO string (AD). BS is only for display/entry.
//
// Reference point: BS 2000/1/1 = AD 1943-04-14
// Month lengths sourced from official Nepal government calendars.

export const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra',  'Ashwin', 'Kartik', 'Mangsir',
  'Poush',   'Magh',   'Falgun', 'Chaitra',
]

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ',   'असार',   'साउन',
  'भाद्र', 'असोज', 'कार्तिक', 'मंसिर',
  'पुस',   'माघ',   'फागुन',  'चैत',
]

// Days per month for each BS year [Baishakh…Chaitra]
const BS_DATA = {
  2060: [31,32,31,32,31,30,30,30,29,30,29,31],
  2061: [31,31,32,31,31,31,30,29,30,29,30,30],
  2062: [31,32,31,32,31,30,30,30,29,30,29,31],
  2063: [31,31,32,32,31,30,30,30,29,30,29,30],
  2064: [31,32,31,32,31,30,30,30,29,30,29,31],
  2065: [31,31,32,31,31,31,30,29,30,29,30,30],
  2066: [31,31,32,32,31,30,30,30,29,29,30,31],
  2067: [30,32,31,32,31,30,30,30,29,30,29,31],
  2068: [31,31,32,31,31,31,30,29,30,29,30,30],
  2069: [31,31,32,31,32,30,30,29,30,29,30,30],
  2070: [31,32,31,32,31,30,30,30,29,30,29,31],
  2071: [31,31,31,32,31,31,30,29,30,29,30,30],
  2072: [31,31,32,31,31,31,30,29,30,29,30,30],
  2073: [31,32,31,32,31,30,30,30,29,29,30,30],
  2074: [31,32,31,32,31,30,30,30,29,30,29,31],
  2075: [31,31,32,31,31,31,30,29,30,29,30,30],
  2076: [31,32,31,32,31,30,30,29,30,29,30,30],
  2077: [31,32,31,32,31,30,30,30,29,30,29,31],
  2078: [31,31,32,31,31,31,30,29,30,29,30,30],
  2079: [31,31,32,31,31,31,30,29,30,29,30,30],
  2080: [31,32,31,32,31,30,30,30,29,30,29,31],
  2081: [31,31,31,32,31,31,30,29,30,29,30,30],
  2082: [31,31,32,31,31,31,30,29,30,29,30,30],
  2083: [31,32,31,32,31,30,30,30,29,29,30,30],
  2084: [31,31,32,32,31,30,30,29,30,29,30,30],
  2085: [31,32,31,32,31,30,30,30,29,30,29,31],
  2086: [31,31,32,31,31,31,30,29,30,29,30,30],
  2087: [31,32,31,32,31,30,30,30,29,30,29,31],
  2088: [30,32,31,32,31,30,30,30,29,30,29,31],
  2089: [31,31,32,31,31,31,30,29,30,29,30,30],
  2090: [31,31,32,31,32,30,30,29,30,29,30,30],
}

const REF_BS_YEAR = 2000
const REF_BS_MONTH = 1
const REF_BS_DAY = 1
// BS 2000/1/1 = AD 1943-04-14
const REF_AD = new Date(Date.UTC(1943, 3, 14)) // April = month 3 (0-indexed)

const MS_PER_DAY = 86400000

function countDaysFromRefToBs(bsYear, bsMonth, bsDay) {
  let days = 0
  // Sum complete years from reference to bsYear-1
  for (let y = REF_BS_YEAR; y < bsYear; y++) {
    const data = BS_DATA[y]
    if (data) days += data.reduce((a, b) => a + b, 0)
  }
  // Sum complete months in bsYear up to bsMonth-1
  const monthData = BS_DATA[bsYear]
  if (monthData) {
    for (let m = 0; m < bsMonth - 1; m++) days += monthData[m]
  }
  days += bsDay - 1
  return days
}

/** Convert a Bikram Sambat date to a JS Date (UTC midnight) */
export function bsToAd(bsYear, bsMonth, bsDay) {
  const days = countDaysFromRefToBs(bsYear, bsMonth, bsDay)
  return new Date(REF_AD.getTime() + days * MS_PER_DAY)
}

/** Convert a JS Date to Bikram Sambat { year, month, day } */
export function adToBs(adDate) {
  const utc = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate())
  let remaining = Math.round((utc - REF_AD.getTime()) / MS_PER_DAY)

  let bsYear = REF_BS_YEAR
  let bsMonth = REF_BS_MONTH
  let bsDay = REF_BS_DAY

  // Walk through years
  while (remaining > 0 && BS_DATA[bsYear]) {
    const yearDays = BS_DATA[bsYear].reduce((a, b) => a + b, 0)
    if (remaining < yearDays) break
    remaining -= yearDays
    bsYear++
  }

  // Walk through months
  if (BS_DATA[bsYear]) {
    for (let m = 0; m < 12; m++) {
      const mDays = BS_DATA[bsYear][m]
      if (remaining < mDays) {
        bsMonth = m + 1
        bsDay = remaining + 1
        break
      }
      remaining -= mDays
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay }
}

/** Convert AD ISO string "YYYY-MM-DD" to BS object */
export function isoToBs(isoStr) {
  if (!isoStr) return null
  const [y, m, d] = isoStr.split('-').map(Number)
  return adToBs(new Date(Date.UTC(y, m - 1, d)))
}

/** Convert BS { year, month, day } to AD ISO string "YYYY-MM-DD" */
export function bsToIso(year, month, day) {
  const ad = bsToAd(year, month, day)
  return ad.toISOString().split('T')[0]
}

/** Get number of days in a BS month */
export function bsMonthDays(bsYear, bsMonth) {
  return (BS_DATA[bsYear] || [])[bsMonth - 1] || 30
}

/** Format AD ISO string as "15 Baisakh 2082 (AD 2025-04-28)" */
export function formatDateBilingual(isoStr) {
  if (!isoStr) return '—'
  const bs = isoToBs(isoStr)
  const [y, m, d] = isoStr.split('-').map(Number)
  const adLabel = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  if (!bs) return adLabel
  return `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year} BS`
}

/** Short bilingual format for tables */
export function formatDateShort(isoStr) {
  if (!isoStr) return '—'
  const bs = isoToBs(isoStr)
  if (!bs) {
    const [y, m, d] = isoStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return `${bs.day} ${BS_MONTHS[bs.month - 1].slice(0, 3)} ${bs.year}`
}

export const BS_YEAR_RANGE = Object.keys(BS_DATA).map(Number).sort((a, b) => a - b)
