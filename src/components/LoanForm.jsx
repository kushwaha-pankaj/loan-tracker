import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const LENDER_TYPES = [
  { value: 'person', label: '👤 Individual Person' },
  { value: 'cooperative', label: '🤝 Cooperative (Sahakari)' },
  { value: 'bank', label: '🏦 Bank' },
  { value: 'microfinance', label: '💳 Microfinance Institution' },
]

const EMPTY_FORM = {
  lenderName: '',
  lenderType: 'person',
  borrowerName: '',
  loanDate: new Date().toISOString().split('T')[0],
  principal: '',
  interestRate: '',
  rateType: 'annual',
  interestType: 'simple',
  compoundFrequency: 'monthly',
  notes: '',
  isActive: true,
}

export default function LoanForm({ loan, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const isEdit = !!loan

  useEffect(() => {
    if (loan) {
      setForm({ ...EMPTY_FORM, ...loan })
    }
  }, [loan])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.lenderName.trim()) e.lenderName = 'Lender name is required'
    if (!form.borrowerName.trim()) e.borrowerName = 'Borrower name is required'
    if (!form.loanDate) e.loanDate = 'Loan date is required'
    const p = parseFloat(form.principal)
    if (!form.principal || isNaN(p) || p <= 0) e.principal = 'Enter a valid principal amount'
    const r = parseFloat(form.interestRate)
    if (!form.interestRate || isNaN(r) || r < 0) e.interestRate = 'Enter a valid interest rate'
    if (new Date(form.loanDate) > new Date()) e.loanDate = 'Loan date cannot be in the future'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    onSave({
      ...form,
      id: loan?.id || uuidv4(),
      principal: form.principal.toString().replace(/,/g, ''),
      interestRate: form.interestRate.toString(),
    })
    onClose()
  }

  // Preview calculation
  const previewInterest = () => {
    const p = parseFloat(form.principal) || 0
    const r = parseFloat(form.interestRate) || 0
    const annual = form.rateType === 'monthly' ? r * 12 : r
    return `${annual.toFixed(1)}% per annum · ${(annual / 12).toFixed(2)}% per month`
  }

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'Edit Loan' : 'Add New Loan'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? 'Update loan details' : 'Record a loan in your tracker'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Lender section */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Lender Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Lender Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Ramesh Sharma, NBL"
                  value={form.lenderName}
                  onChange={(e) => set('lenderName', e.target.value)}
                />
                {errors.lenderName && <p className="text-red-500 text-xs mt-1">{errors.lenderName}</p>}
              </div>
              <div>
                <label className="label">Lender Type *</label>
                <select
                  className="input-field"
                  value={form.lenderType}
                  onChange={(e) => set('lenderType', e.target.value)}
                >
                  {LENDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Borrower + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Borrower Name *</label>
              <input
                className="input-field"
                placeholder="Family member who took the loan"
                value={form.borrowerName}
                onChange={(e) => set('borrowerName', e.target.value)}
              />
              {errors.borrowerName && <p className="text-red-500 text-xs mt-1">{errors.borrowerName}</p>}
            </div>
            <div>
              <label className="label">Loan Date *</label>
              <input
                type="date"
                className="input-field"
                value={form.loanDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => set('loanDate', e.target.value)}
              />
              {errors.loanDate && <p className="text-red-500 text-xs mt-1">{errors.loanDate}</p>}
            </div>
          </div>

          {/* Financial details */}
          <div className="bg-red-50 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Loan Amount & Interest</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Principal Amount (NPR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₨</span>
                  <input
                    className="input-field pl-7"
                    placeholder="e.g. 200000"
                    value={form.principal}
                    onChange={(e) => set('principal', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
              </div>

              <div>
                <label className="label">Interest Rate *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="input-field pr-7"
                      placeholder="e.g. 18"
                      value={form.interestRate}
                      onChange={(e) => set('interestRate', e.target.value)}
                      inputMode="decimal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  <select
                    className="input-field w-auto"
                    value={form.rateType}
                    onChange={(e) => set('rateType', e.target.value)}
                    title="Rate period"
                  >
                    <option value="annual">/ Year</option>
                    <option value="monthly">/ Month</option>
                  </select>
                </div>
                {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
                {form.interestRate && !errors.interestRate && (
                  <p className="text-xs text-slate-500 mt-1">{previewInterest()}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Interest Calculation</label>
                <div className="flex gap-2">
                  {['simple', 'compound'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set('interestType', type)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                        form.interestType === type
                          ? 'bg-nepal-red text-white border-nepal-red'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-nepal-red'
                      }`}
                    >
                      {type === 'simple' ? '📐 Simple' : '📈 Compound'}
                    </button>
                  ))}
                </div>
              </div>

              {form.interestType === 'compound' && (
                <div>
                  <label className="label">Compounded</label>
                  <select
                    className="input-field"
                    value={form.compoundFrequency}
                    onChange={(e) => set('compoundFrequency', e.target.value)}
                  >
                    <option value="monthly">Monthly (12x/year)</option>
                    <option value="quarterly">Quarterly (4x/year)</option>
                    <option value="annually">Annually (1x/year)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Purpose, conditions, collateral..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => set('isActive', true)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    form.isActive
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-green-600'
                  }`}
                >
                  ✅ Active
                </button>
                <button
                  type="button"
                  onClick={() => set('isActive', false)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    !form.isActive
                      ? 'bg-slate-500 text-white border-slate-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-500'
                  }`}
                >
                  🏁 Paid/Closed
                </button>
              </div>
              {!form.isActive && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Closed loans are excluded from totals
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
