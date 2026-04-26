import { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, CheckCircle2, IndianRupee } from 'lucide-react'
import Sheet from './Sheet'
import {
  formatNPR,
  getNewPaymentBreakdown,
  getTotalDueOnDate,
  computeStateAfterNewPayment,
  toYmd,
} from '../utils/calculations'
import {
  BS_MONTHS,
  BS_YEAR_RANGE,
  bsMonthDays,
  bsToIso,
  formatDateBilingual,
  formatDateShort,
  isoToBs,
} from '../utils/nepaliDate'

const PRESETS = [
  { label: '25K', value: 25000 },
  { label: '50K', value: 50000 },
  { label: '1L', value: 100000 },
  { label: '2L', value: 200000 },
  { label: '5L', value: 500000 },
]

function localTodayYmd() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function RecordPaymentSheet({ loan, onSave, onClose, busy }) {
  const [step, setStep] = useState(1)
  const [amountStr, setAmountStr] = useState('')
  const [payDate, setPayDate] = useState(() => localTodayYmd())
  const [dateMode, setDateMode] = useState('bs')
  const initialBs = isoToBs(localTodayYmd())
  const [bsYear, setBsYear] = useState(initialBs?.year || 2082)
  const [bsMonth, setBsMonth] = useState(initialBs?.month || 1)
  const [bsDay, setBsDay] = useState(initialBs?.day || 1)
  const [note, setNote] = useState('')

  const amountNum = useMemo(
    () => Math.max(0, Math.round(parseFloat(amountStr) || 0)),
    [amountStr],
  )

  const minDate = toYmd(loan.loanDate)
  const maxDate = localTodayYmd()
  const minBs = useMemo(() => isoToBs(minDate), [minDate])
  const maxBs = useMemo(() => isoToBs(maxDate), [maxDate])
  const daysInBsMonth = bsMonthDays(bsYear, bsMonth)

  useEffect(() => {
    const bs = isoToBs(payDate)
    if (!bs) return
    setBsYear(bs.year)
    setBsMonth(bs.month)
    setBsDay(bs.day)
  }, [payDate])

  const breakdown = useMemo(() => {
    if (amountNum <= 0) return null
    return getNewPaymentBreakdown(loan, payDate, amountNum)
  }, [loan, payDate, amountNum])

  const totalDue = useMemo(() => getTotalDueOnDate(loan, payDate), [loan, payDate])

  const previewAfter = useMemo(() => {
    if (amountNum <= 0 || !breakdown || breakdown.error) return null
    const applied = Math.min(amountNum, totalDue, breakdown.applied)
    return computeStateAfterNewPayment(loan, {
      id: 'preview-temp',
      amount: applied,
      date: payDate,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    })
  }, [loan, payDate, amountNum, breakdown, totalDue, note])

  function goNext() {
    if (step === 1) {
      if (amountNum <= 0) return
      if (parseFloat(amountStr) <= 0) return
    }
    if (step === 2) {
      if (payDate < minDate || payDate > maxDate) return
    }
    if (step < 3) setStep((s) => s + 1)
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  function handleConfirm() {
    if (amountNum <= 0 || !breakdown || breakdown.error) return
    onSave({
      id: uuidv4(),
      amount: breakdown.applied,
      date: payDate,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    })
  }

  function applyBsDate(y, m, d) {
    const safeDay = Math.min(d, bsMonthDays(y, m))
    const iso = bsToIso(y, m, safeDay)
    if (!iso) return
    if (iso < minDate || iso > maxDate) return
    setPayDate(iso)
  }

  return (
    <Sheet open onClose={onClose} size="md" labelledBy="record-payment-title" className="max-w-lg">
      {({ titleId }) => (
        <div className="flex flex-col max-h-[100dvh] sm:max-h-[90dvh]">
          <div className="shrink-0 border-b border-slate-100 px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-lg font-bold text-slate-800">
              Record payment
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
              Step {step} / 3
            </span>
          </div>

          {step === 1 && (
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{loan.lenderName}</span>
                <span className="text-slate-400"> · </span>
                {loan.borrowerName}
              </p>
              <p className="text-xs text-slate-500">
                ब्याज पहिले, पछि मूलधन (byaj first, then principal). Due on date:{' '}
                <span className="font-semibold text-slate-700 currency">{formatNPR(totalDue)}</span>
              </p>
              <div>
                <label htmlFor="pay-amount" className="label">
                  Amount (NPR) *
                </label>
                <div className="relative mt-1">
                  <IndianRupee
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="pay-amount"
                    className="input-field pl-10 currency"
                    inputMode="numeric"
                    enterKeyHint="next"
                    autoComplete="off"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 200000"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAmountStr(String(p.value))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white
                               hover:border-nepal-red/40 hover:bg-red-50/50 transition-[transform,colors] duration-180 ease-ios min-h-[40px] active:scale-[0.98]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
              <label className="label">
                Payment date *
              </label>
              <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateMode('bs')}
                  aria-pressed={dateMode === 'bs'}
                  className={`px-3 py-2 min-h-[36px] transition-colors duration-180 ${
                    dateMode === 'bs' ? 'bg-nepal-red text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  BS
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('ad')}
                  aria-pressed={dateMode === 'ad'}
                  className={`px-3 py-2 min-h-[36px] transition-colors duration-180 ${
                    dateMode === 'ad' ? 'bg-nepal-red text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  AD
                </button>
              </div>

              {dateMode === 'bs' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className="input-field text-sm min-h-[44px]"
                      aria-label="Payment year in Bikram Sambat"
                      value={bsYear}
                      onChange={(e) => {
                        const y = Number(e.target.value)
                        setBsYear(y)
                        applyBsDate(y, bsMonth, bsDay)
                      }}
                    >
                      {BS_YEAR_RANGE.map((y) => (
                        <option key={y} value={y}>
                          {y} BS
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-field text-sm min-h-[44px]"
                      aria-label="Payment month in Bikram Sambat"
                      value={bsMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value)
                        setBsMonth(m)
                        applyBsDate(bsYear, m, bsDay)
                      }}
                    >
                      {BS_MONTHS.map((name, idx) => (
                        <option key={name} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-field text-sm min-h-[44px]"
                      aria-label="Payment day in Bikram Sambat"
                      value={bsDay}
                      onChange={(e) => {
                        const d = Number(e.target.value)
                        setBsDay(d)
                        applyBsDate(bsYear, bsMonth, d)
                      }}
                    >
                      {Array.from({ length: daysInBsMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500">
                    AD equivalent: <span className="font-medium text-slate-700">{formatDateShort(payDate)}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    id="pay-date"
                    type="date"
                    className="input-field min-h-[44px]"
                    min={minDate}
                    max={maxDate}
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    aria-label="Payment date in AD"
                  />
                  <p className="text-xs text-slate-500">
                    BS equivalent: <span className="font-medium text-slate-700">{formatDateBilingual(payDate)}</span>
                  </p>
                </div>
              )}
              {minBs && maxBs && (
                <p className="text-xs text-slate-400">
                  Allowed range: {minBs.day} {BS_MONTHS[minBs.month - 1]} {minBs.year} BS to {maxBs.day}{' '}
                  {BS_MONTHS[maxBs.month - 1]} {maxBs.year} BS
                </p>
              )}
              <p className="text-xs text-slate-500">Loan started {formatDateShort(loan.loanDate)}</p>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {breakdown?.error && (
                <p role="alert" className="text-sm text-red-600">
                  {breakdown.error}
                </p>
              )}
              {breakdown && !breakdown.error && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
                    <p>
                      <span className="text-slate-500">Payment on </span>
                      <span className="font-semibold text-slate-800">{formatDateShort(payDate)}</span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-slate-600">To interest (byaj)</span>
                      <span className="font-semibold text-orange-600 currency">
                        {formatNPR(breakdown.toInterest)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-slate-600">To principal (mool)</span>
                      <span className="font-semibold text-slate-800 currency">
                        {formatNPR(breakdown.toPrincipal)}
                      </span>
                    </p>
                    {amountNum > breakdown.totalDueOnDate && (
                      <p role="status" className="text-amber-700 text-xs">
                        You entered {formatNPR(amountNum)}; only {formatNPR(breakdown.applied)} is applied (full
                        settlement for that day is {formatNPR(breakdown.totalDueOnDate)}).
                      </p>
                    )}
                  </div>
                  {previewAfter && (
                    <div className="rounded-xl border border-nepal-blue/20 bg-nepal-blue/5 p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
                        Remaining from today
                      </p>
                      <p className="text-lg font-extrabold text-nepal-red currency mt-1">
                        {formatNPR(previewAfter.totalOutstanding)}
                      </p>
                    </div>
                  )}
                </>
              )}
              <div>
                <label htmlFor="pay-note" className="label">
                  Note (optional)
                </label>
                <textarea
                  id="pay-note"
                  className="input-field min-h-[72px] py-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  enterKeyHint="done"
                  placeholder="e.g. Cash to co-operative, bank transfer…"
                />
              </div>
            </div>
          )}

          <div className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-slate-100 bg-white">
            {step > 1 ? (
              <button type="button" onClick={goBack} className="btn-secondary min-h-[48px] flex-1" disabled={busy}>
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn-secondary min-h-[48px] flex-1" disabled={busy}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="btn-primary min-h-[48px] flex-1"
                disabled={busy || (step === 1 && amountNum <= 0) || (step === 2 && (payDate < minDate || payDate > maxDate))}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary min-h-[48px] flex-1"
                disabled={busy || !breakdown || breakdown.error || amountNum <= 0}
              >
                {busy ? 'Saving…' : 'Save payment'}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
