/**
 * Format amount in Nepali Rupees with lakh notation
 * e.g. 150000 → "NPR 1,50,000"
 */
export function formatNPR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'NPR 0'
  const abs = Math.abs(Math.round(amount))
  // Nepali number grouping: last 3 digits, then groups of 2
  const str = abs.toString()
  let formatted
  if (str.length <= 3) {
    formatted = str
  } else {
    const last3 = str.slice(-3)
    const rest = str.slice(0, -3)
    const groups = []
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i))
    }
    formatted = groups.join(',') + ',' + last3
  }
  return (amount < 0 ? '-' : '') + 'NPR ' + formatted
}

/**
 * Convert amount to lakh string: 150000 → "1.50 Lakh"
 */
export function toLakh(amount) {
  if (!amount) return '0'
  const lakh = amount / 100000
  if (lakh >= 100) return (lakh / 100).toFixed(2) + ' Cr'
  if (lakh >= 1) return lakh.toFixed(2) + ' Lakh'
  const thousand = amount / 1000
  if (thousand >= 1) return thousand.toFixed(1) + 'K'
  return amount.toLocaleString()
}

// ── Annual rate (same as legacy calculateLoanMetrics) ───────────────────────
export function getAnnualRate(loan) {
  const rawRate = parseFloat(loan.interestRate) || 0
  return loan.rateType === 'monthly' ? rawRate * 12 : rawRate
}

function normDate(d) {
  if (d == null) return new Date(NaN)
  // Firestore Timestamp { toDate() }
  if (typeof d.toDate === 'function') return normDate(d.toDate())
  if (d instanceof Date) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const s = String(d).trim()
  const iso = s.includes('T') ? s : `${s}T00:00:00`
  const x = new Date(iso)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysBetween(from, to) {
  const ms = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((to - from) / ms))
}

/** Normalize loan/payment dates (ISO string, Date, or Firestore Timestamp) to YYYY-MM-DD. */
export function toYmd(d) {
  if (d == null) return ''
  if (typeof d.toDate === 'function') return d.toDate().toISOString().slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).trim().slice(0, 10)
}

export function sortPayments(payments) {
  if (!payments?.length) return []
  return [...payments]
    .filter((p) => p && p.date)
    .map((p) => {
      const raw = p.amount
      const n = typeof raw === 'string' ? parseFloat(raw) : raw
      return { ...p, date: toYmd(p.date), amount: Math.round(Math.abs(Number.isFinite(n) ? n : 0)) }
    })
    .filter((p) => p.amount > 0)
    .sort((a, b) => {
      const c = a.date.localeCompare(b.date)
      if (c !== 0) return c
      return (a.id || '').localeCompare(b.id || '')
    })
}

/** Accrue interest on outstanding principal P from fromD to toD. */
export function accrueSegmentInterest(loan, P, fromD, toD) {
  if (P <= 0) return 0
  const from = normDate(fromD)
  const to = normDate(toD)
  if (to < from) return 0
  if (daysBetween(from, to) === 0) return 0
  const years = daysBetween(from, to) / 365.25
  const annualRate = getAnnualRate(loan)
  if (loan.interestType === 'simple') {
    return P * (annualRate / 100) * years
  }
  const n =
    loan.compoundFrequency === 'monthly' ? 12 : loan.compoundFrequency === 'quarterly' ? 4 : 1
  const r = annualRate / 100
  return P * (Math.pow(1 + r / n, n * years) - 1)
}

/**
 * With optional loan.payments, walk segments: byaj first, then mool. No payments = same as old single loan.
 * @param {string|Date} asOf
 */
export function computeLoanState(loan, asOf = new Date()) {
  const asOfD = normDate(asOf)
  const loanDate = normDate(loan.loanDate)
  const originalPrincipal = Math.max(0, parseFloat(loan.principal) || 0)
  const annualRate = getAnnualRate(loan)
  const monthlyRate = annualRate / 12
  const daysElapsed = daysBetween(loanDate, asOfD)
  const yearsElapsed = daysElapsed / 365.25

  const payList = sortPayments(loan.payments).filter((p) => normDate(p.date) <= asOfD)

  let P = originalPrincipal
  let unpaid = 0
  let last = loanDate
  let totalPaid = 0

  for (const p of payList) {
    const payD = normDate(p.date)
    if (payD < loanDate) continue
    if (payD > asOfD) break

    unpaid += accrueSegmentInterest(loan, P, last, payD)
    const maxSettle = unpaid + P
    const applied = Math.min(p.amount, maxSettle)
    const toI = Math.min(applied, unpaid)
    const rest = applied - toI
    const toP = Math.min(rest, P)
    unpaid -= toI
    P -= toP
    totalPaid += applied
    last = payD
  }

  if (asOfD > last) {
    unpaid += accrueSegmentInterest(loan, P, last, asOfD)
  }

  const interestOwed = Math.max(0, Math.round(unpaid))
  P = Math.max(0, Math.round(P))
  const totalOutstanding = P + interestOwed
  const interest = interestOwed
  const dailyInterest = P > 0 ? Math.round((P * annualRate) / (100 * 365.25)) : 0
  return {
    originalPrincipal: Math.round(originalPrincipal),
    outstandingPrincipal: P,
    interestOwed,
    totalOutstanding,
    totalPaid,
    daysElapsed,
    monthsElapsed: Math.round(daysElapsed / 30.44),
    yearsElapsed,
    annualRate,
    monthlyRate,
    dailyInterest,
    interest,
    total: totalOutstanding,
    interestPercent: P > 0 ? ((interestOwed / P) * 100).toFixed(1) : interestOwed > 0 ? '0' : '0',
  }
}

/**
 * All loan display metrics (replaces one-shot principal+interest; payment-aware when loan.payments exists).
 */
export function calculateLoanMetrics(loan) {
  return computeLoanState(loan, new Date())
}

/** Full amount to settle the loan on a given day (byaj pahilai, then mool, then accrual to that day). */
export function getTotalDueOnDate(loan, payDate) {
  return computeLoanState(loan, normDate(payDate)).totalOutstanding
}

/**
 * For a new repayment, how much goes to byaj vs mool (and how much of the input could apply), before future accrual.
 * Same-day: new entry sorts after existing rows (id zz__new).
 */
export function getNewPaymentBreakdown(loan, payDate, amount) {
  const d = normDate(payDate)
  const loanDate = normDate(loan.loanDate)
  if (d < loanDate) return { error: 'Payment date can’t be before the loan start date.' }
  const amt = Math.max(0, Math.round(typeof amount === 'string' ? parseFloat(amount) : amount) || 0)
  if (amt === 0) return { toInterest: 0, toPrincipal: 0, applied: 0, totalDueOnDate: 0 }
  const dateStr =
    typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(payDate)
      ? payDate.slice(0, 10)
      : d.toISOString().slice(0, 10)
  const all = sortPayments([
    ...(loan.payments || []),
    { id: 'zz__new', amount: amt, date: dateStr, createdAt: new Date().toISOString() },
  ]).filter((p) => normDate(p.date) <= d)
  let P = Math.max(0, parseFloat(loan.principal) || 0)
  let unpaid = 0
  let last = loanDate
  let totalDueOnDate = 0
  for (const p of all) {
    const payD = normDate(p.date)
    if (payD < loanDate) continue
    if (normDate(payD) > d) break
    unpaid += accrueSegmentInterest(loan, P, last, payD)
    if (p.id === 'zz__new') {
      totalDueOnDate = Math.round(unpaid + P)
    }
    const maxSettle = unpaid + P
    const applied = Math.min(p.amount, maxSettle)
    const toI = Math.min(applied, unpaid)
    const rest = applied - toI
    const toP = Math.min(rest, P)
    if (p.id === 'zz__new') {
      return {
        toInterest: Math.round(toI),
        toPrincipal: Math.round(toP),
        applied: Math.round(applied),
        totalDueOnDate,
      }
    }
    unpaid -= toI
    P -= toP
    last = payD
  }
  return { error: 'Could not apply payment' }
}

/**
 * State after appending a payment (for review step / preview).
 */
export function computeStateAfterNewPayment(loan, payment) {
  const merged = { ...loan, payments: sortPayments([...(loan.payments || []), payment]) }
  return computeLoanState(merged, new Date())
}

/**
 * Project outstanding amount month by month for next N months (payment-aware; no new payments assumed).
 */
export function projectMonthly(loan, months = 12) {
  const points = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const baseY = today.getFullYear()
  const baseM = today.getMonth()
  const baseD = today.getDate()

  for (let m = 0; m <= months; m++) {
    const targetY = baseY + Math.floor((baseM + m) / 12)
    const targetM = (baseM + m) % 12
    const lastDay = new Date(targetY, targetM + 1, 0).getDate()
    const projDate = new Date(targetY, targetM, Math.min(baseD, lastDay))
    projDate.setHours(0, 0, 0, 0)
    const s = computeLoanState(loan, projDate)
    const label =
      m === 0
        ? 'Today'
        : projDate.toLocaleString('default', { month: 'short', year: '2-digit' })
    points.push({
      month: label,
      interest: s.interestOwed,
      outstanding: s.totalOutstanding,
    })
  }
  return points
}

/**
 * Aggregate summary across all active loans
 */
export function aggregateSummary(loans) {
  const active = loans.filter((l) => l.isActive)
  let totalPrincipal = 0
  let totalInterestOwed = 0
  let totalOutstanding = 0
  let totalPaid = 0

  active.forEach((loan) => {
    const s = computeLoanState(loan, new Date())
    totalPrincipal += parseFloat(loan.principal) || 0
    totalInterestOwed += s.interestOwed
    totalOutstanding += s.totalOutstanding
    totalPaid += s.totalPaid
  })

  return {
    totalPrincipal: Math.round(totalPrincipal),
    totalInterest: Math.round(totalInterestOwed),
    totalOutstanding: Math.round(totalOutstanding),
    totalPaid: Math.round(totalPaid),
    activeCount: active.length,
    totalCount: loans.length,
  }
}

/**
 * Risk level for a loan based on rate and age
 */
export function riskLevel(loan) {
  const { annualRate, daysElapsed } = calculateLoanMetrics(loan)
  if (annualRate >= 24 || daysElapsed > 730) return 'high'
  if (annualRate >= 15 || daysElapsed > 365) return 'medium'
  return 'low'
}

/**
 * Sample/demo loans for first-time users
 */
export function getSampleLoans() {
  const today = new Date()
  const d = (months) => {
    const dt = new Date(today)
    dt.setMonth(dt.getMonth() - months)
    return dt.toISOString().split('T')[0]
  }

  return [
    {
      id: 'sample-1',
      lenderName: 'Ramesh Sharma',
      lenderType: 'person',
      borrowerName: 'Pankaj (Self)',
      loanDate: d(14),
      principal: '200000',
      interestRate: '18',
      rateType: 'annual',
      interestType: 'simple',
      compoundFrequency: 'monthly',
      notes: 'Personal loan from neighbor',
      isActive: true,
    },
    {
      id: 'sample-2',
      lenderName: 'Shree Cooperative',
      lenderType: 'cooperative',
      borrowerName: 'Pankaj (Self)',
      loanDate: d(20),
      principal: '500000',
      interestRate: '1.5',
      rateType: 'monthly',
      interestType: 'simple',
      compoundFrequency: 'monthly',
      notes: 'Agriculture cooperative loan',
      isActive: true,
    },
    {
      id: 'sample-3',
      lenderName: 'Nepal Bank Limited',
      lenderType: 'bank',
      borrowerName: 'Pankaj (Self)',
      loanDate: d(30),
      principal: '1000000',
      interestRate: '12',
      rateType: 'annual',
      interestType: 'compound',
      compoundFrequency: 'monthly',
      notes: 'Home loan',
      isActive: true,
    },
    {
      id: 'sample-4',
      lenderName: 'Sunita Devi',
      lenderType: 'person',
      borrowerName: 'Sunita (Wife)',
      loanDate: d(8),
      principal: '50000',
      interestRate: '2',
      rateType: 'monthly',
      interestType: 'simple',
      compoundFrequency: 'monthly',
      notes: 'Emergency loan from relative',
      isActive: true,
    },
  ]
}
