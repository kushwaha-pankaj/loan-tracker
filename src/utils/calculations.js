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

/**
 * Calculate all loan metrics from the loan object
 */
export function calculateLoanMetrics(loan) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const loanDate = new Date(loan.loanDate)
  loanDate.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysElapsed = Math.max(0, Math.floor((today - loanDate) / msPerDay))
  const yearsElapsed = daysElapsed / 365.25

  const principal = parseFloat(loan.principal) || 0

  // Normalize to annual rate
  const rawRate = parseFloat(loan.interestRate) || 0
  const annualRate = loan.rateType === 'monthly' ? rawRate * 12 : rawRate
  const monthlyRate = annualRate / 12

  let interest = 0

  if (loan.interestType === 'simple') {
    interest = principal * (annualRate / 100) * yearsElapsed
  } else {
    // Compound interest: A = P(1 + r/n)^(nt)
    const n =
      loan.compoundFrequency === 'monthly'
        ? 12
        : loan.compoundFrequency === 'quarterly'
        ? 4
        : 1
    const r = annualRate / 100
    interest = principal * (Math.pow(1 + r / n, n * yearsElapsed) - 1)
  }

  interest = Math.max(0, Math.round(interest))
  const total = Math.round(principal + interest)

  // Daily interest (approximate; uses 365.25 to match yearsElapsed above)
  const dailyInterest = Math.round((principal * annualRate) / (100 * 365.25))

  return {
    daysElapsed,
    monthsElapsed: Math.round(daysElapsed / 30.44),
    yearsElapsed,
    interest,
    total,
    annualRate,
    monthlyRate,
    dailyInterest,
    interestPercent: principal > 0 ? ((interest / principal) * 100).toFixed(1) : 0,
  }
}

/**
 * Project outstanding amount month by month for next N months
 */
export function projectMonthly(loan, months = 12) {
  const points = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const loanDate = new Date(loan.loanDate)
  loanDate.setHours(0, 0, 0, 0)

  const principal = parseFloat(loan.principal) || 0
  const rawRate = parseFloat(loan.interestRate) || 0
  const annualRate = loan.rateType === 'monthly' ? rawRate * 12 : rawRate

  // Step the projection date forward by month using year/month/day arithmetic
  // (NOT setMonth, which clips Jan 31 + 1 month → Feb 28 and silently drops
  // 1–3 days every month for loans dated on the 29th–31st).
  const baseY = today.getFullYear()
  const baseM = today.getMonth()
  const baseD = today.getDate()

  for (let m = 0; m <= months; m++) {
    const targetY = baseY + Math.floor((baseM + m) / 12)
    const targetM = (baseM + m) % 12
    const lastDay = new Date(targetY, targetM + 1, 0).getDate()
    const projDate = new Date(targetY, targetM, Math.min(baseD, lastDay))
    projDate.setHours(0, 0, 0, 0)

    const daysTotal = Math.max(0, Math.floor((projDate - loanDate) / 86400000))
    const years = daysTotal / 365.25

    let interest = 0
    if (loan.interestType === 'simple') {
      interest = principal * (annualRate / 100) * years
    } else {
      const n =
        loan.compoundFrequency === 'monthly'
          ? 12
          : loan.compoundFrequency === 'quarterly'
          ? 4
          : 1
      interest = principal * (Math.pow(1 + annualRate / (100 * n), n * years) - 1)
    }

    const label =
      m === 0
        ? 'Today'
        : projDate.toLocaleString('default', { month: 'short', year: '2-digit' })

    points.push({
      month: label,
      interest: Math.round(Math.max(0, interest)),
      outstanding: Math.round(principal + Math.max(0, interest)),
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
  let totalInterest = 0

  active.forEach((loan) => {
    const { interest } = calculateLoanMetrics(loan)
    totalPrincipal += parseFloat(loan.principal) || 0
    totalInterest += interest
  })

  return {
    totalPrincipal: Math.round(totalPrincipal),
    totalInterest: Math.round(totalInterest),
    totalOutstanding: Math.round(totalPrincipal + totalInterest),
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
