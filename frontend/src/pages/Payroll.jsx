import { useState, useEffect } from 'react';
import { api } from '../api';
import { Calculator, FileText, CheckCircle, Clock, TrendingDown, X, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { generateSalarySlipPDF } from '../utils/pdfGenerator';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PAYMENT_MODES = [
  { id: 'Cash',   label: 'Cash',   icon: Banknote },
  { id: 'UPI',    label: 'UPI',    icon: Smartphone },
  { id: 'Cheque', label: 'Cheque', icon: CreditCard },
];

function PaymentModal({ record, onSave, onClose }) {
  const alreadyPaid = record.paid_amount || 0;
  const remaining = record.net_payable - alreadyPaid;
  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState(String(remaining.toFixed(2)));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const payAmt = parseFloat(amount) || 0;
  const newTotal = alreadyPaid + payAmt;
  const willBePartial = newTotal < record.net_payable && newTotal > 0;
  const willBeFullyPaid = newTotal >= record.net_payable;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (payAmt <= 0) return setError('Amount must be greater than 0');
    setSaving(true);
    setError('');
    try {
      await api.markPaid(record.id, { payment_date: date, payment_mode: mode, paid_amount: payAmt });
      onSave();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
            <p className="text-sm text-gray-500">{record.name} — {record.role}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <p className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</p>}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Net Payable</p>
              <p className="font-bold text-gray-900 text-sm">{fmt(record.net_payable)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Already Paid</p>
              <p className="font-bold text-green-700 text-sm">{fmt(alreadyPaid)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Remaining</p>
              <p className="font-bold text-red-600 text-sm">{fmt(remaining)}</p>
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="label mb-2">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    mode === id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="label">
              Amount Paying (₹) *
              <span className="ml-2 text-xs text-gray-400 font-normal">Remaining: {fmt(remaining)}</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              className="input text-lg font-semibold"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            {willBePartial && (
              <p className="text-xs text-orange-600 mt-1">
                ⚡ Partial payment — ₹{(record.net_payable - newTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will remain outstanding
              </p>
            )}
            {willBeFullyPaid && (
              <p className="text-xs text-green-600 mt-1">✓ This will fully clear the salary</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : willBeFullyPaid ? 'Mark as Fully Paid' : 'Save Partial Payment'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [calcForm, setCalcForm] = useState(null);
  const [payRecord, setPayRecord] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const [emps, recs, sum] = await Promise.all([
        api.getEmployees(),
        api.getPayroll(month, year),
        api.getPayrollSummary(month, year)
      ]);
      setEmployees(emps);
      setRecords(recs);
      setSummary(sum);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, [month, year]);

  const openCalc = async (emp) => {
    const existing = records.find(r => r.employee_id === emp.id);
    let pendingAdvanceTotal = 0;
    let pendingAdvances = [];
    try {
      const advances = await api.getAdvances(emp.id);
      pendingAdvances = advances.filter(a => a.repayment_status !== 'settled');
      pendingAdvanceTotal = pendingAdvances.reduce((sum, a) => sum + (a.amount - (a.repaid_amount || 0)), 0);
    } catch (_) {}
    setCalcForm({
      employee_id: emp.id,
      emp,
      days_worked: existing?.days_worked || 26,
      advance_deduction: existing?.advance_deduction ?? pendingAdvanceTotal,
      incentive: existing?.incentive || 0,
      other_deduction: existing?.other_deduction || 0,
      notes: existing?.notes || '',
      existing,
      pendingAdvanceTotal,
      pendingAdvances,
    });
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    try {
      await api.calculateSalary({ ...calcForm, month, year });
      setSuccess('Salary calculated successfully');
      setCalcForm(null);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  };

  const getCalcPreview = () => {
    if (!calcForm) return null;
    const gross = parseFloat(((calcForm.emp.base_salary / 30) * calcForm.days_worked).toFixed(2));
    const net = parseFloat((gross + (+calcForm.incentive || 0) - (+calcForm.advance_deduction || 0) - (+calcForm.other_deduction || 0)).toFixed(2));
    return { gross, net };
  };

  const preview = getCalcPreview();
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const unprocessed = employees.filter(e => !records.find(r => r.employee_id === e.id));

  const statusBadge = (r) => {
    if (r.status === 'paid') return <span className="badge-green">Paid</span>;
    if (r.status === 'partial') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Partial</span>;
    return <span className="badge-yellow">Draft</span>;
  };

  return (
    <div className="space-y-5">
      {/* Month/Year Selector */}
      <div className="card flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Month</p>
          <select className="input w-44" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Year</p>
          <select className="input w-28" value={year} onChange={e => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {summary && (
          <div className="ml-auto flex flex-wrap gap-4 text-right">
            <div><p className="text-xs text-gray-500">Total Gross</p><p className="font-bold text-gray-900">{fmt(summary.total_gross)}</p></div>
            <div><p className="text-xs text-gray-500">Total Net</p><p className="font-bold text-green-700">{fmt(summary.total_net)}</p></div>
            <div><p className="text-xs text-gray-500">Paid</p><p className="font-bold text-blue-700">{fmt(summary.total_paid)}</p></div>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

      {/* Salary Calculator Modal */}
      {calcForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Calculate Salary</h3>
                <p className="text-sm text-gray-500">{calcForm.emp.name} — {SHORT_MONTHS[month - 1]} {year}</p>
              </div>
              <button type="button" onClick={() => setCalcForm(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCalculate} className="p-5 space-y-4">
              {/* Pending Advance Alert */}
              {calcForm.pendingAdvanceTotal > 0 && (
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                  calcForm.pendingAdvanceTotal > (calcForm.emp.base_salary * 0.5)
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <TrendingDown size={18} className={calcForm.pendingAdvanceTotal > (calcForm.emp.base_salary * 0.5) ? 'text-orange-500 mt-0.5 flex-shrink-0' : 'text-yellow-600 mt-0.5 flex-shrink-0'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      Pending Advance Balance: <span className="text-red-600">{fmt(calcForm.pendingAdvanceTotal)}</span>
                      {calcForm.pendingAdvanceTotal > (calcForm.emp.base_salary * 0.5) && (
                        <span className="ml-2 text-xs text-orange-600 font-normal">(exceeds 50% of salary)</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {calcForm.pendingAdvances.map(a => (
                        <span key={a.id} className="text-xs bg-white border border-yellow-200 text-gray-600 px-2 py-0.5 rounded-full">
                          ₹{(a.amount - (a.repaid_amount || 0)).toLocaleString('en-IN')} · {a.request_date}
                          {a.reason ? ` (${a.reason})` : ''}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors"
                      onClick={() => setCalcForm(p => ({ ...p, advance_deduction: p.pendingAdvanceTotal }))}
                    >
                      Use full amount as deduction
                    </button>
                  </div>
                </div>
              )}
              {calcForm.pendingAdvanceTotal === 0 && (
                <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle size={14} /> No pending advances for this employee
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Base Salary</label>
                  <input className="input bg-gray-50" value={`₹${calcForm.emp.base_salary.toLocaleString('en-IN')}`} disabled />
                </div>
                <div>
                  <label className="label">Days Worked *</label>
                  <input type="number" step="0.5" min="0" max="31" className="input" value={calcForm.days_worked}
                    onChange={e => setCalcForm(p => ({ ...p, days_worked: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Incentive (₹)</label>
                  <input type="number" className="input" value={calcForm.incentive}
                    onChange={e => setCalcForm(p => ({ ...p, incentive: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Advance Deduction (₹)
                    {calcForm.pendingAdvanceTotal > 0 && (
                      <span className="ml-1 text-xs text-yellow-600 font-normal">(pending: {fmt(calcForm.pendingAdvanceTotal)})</span>
                    )}
                  </label>
                  <input type="number" className={`input ${calcForm.pendingAdvanceTotal > 0 ? 'border-yellow-300 focus:border-yellow-500' : ''}`}
                    value={calcForm.advance_deduction}
                    onChange={e => setCalcForm(p => ({ ...p, advance_deduction: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Other Deductions (₹)</label>
                  <input type="number" className="input" value={calcForm.other_deduction}
                    onChange={e => setCalcForm(p => ({ ...p, other_deduction: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={calcForm.notes} onChange={e => setCalcForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              {preview && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">Preview</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Gross:</span> <span className="font-semibold">{fmt(preview.gross)}</span></div>
                    <div><span className="text-gray-600">Net Payable:</span> <span className="font-bold text-green-700 text-base">{fmt(preview.net)}</span></div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">Calculate & Save</button>
                <button type="button" className="btn-outline" onClick={() => setCalcForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payRecord && (
        <PaymentModal
          record={payRecord}
          onSave={() => { setPayRecord(null); setSuccess('Payment recorded'); load(); setTimeout(() => setSuccess(''), 3000); }}
          onClose={() => setPayRecord(null)}
        />
      )}

      {/* Unprocessed */}
      {unprocessed.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock size={18} className="text-yellow-500" /> Pending Processing ({unprocessed.length})</h3>
          <div className="space-y-2">
            {unprocessed.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.role} · ₹{emp.base_salary.toLocaleString('en-IN')}/month</p>
                </div>
                <button className="btn-primary text-xs py-2" onClick={() => openCalc(emp)}>
                  <Calculator size={14} /> Calculate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Records */}
      {records.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-green-500" /> Salary Records — {SHORT_MONTHS[month - 1]} {year}</h3>
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Employee</th>
                <th className="table-th">Days</th>
                <th className="table-th">Gross</th>
                <th className="table-th">Deductions</th>
                <th className="table-th">Net Payable</th>
                <th className="table-th">Paid</th>
                <th className="table-th">Remaining</th>
                <th className="table-th">Mode</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const paid = r.paid_amount || 0;
                const remaining = r.net_payable - paid;
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-medium">
                      {r.name}
                      <br /><span className="text-xs text-gray-400">{r.emp_code || r.employee_id} · {r.role}</span>
                    </td>
                    <td className="table-td">{r.days_worked}</td>
                    <td className="table-td">{fmt(r.gross_salary)}</td>
                    <td className="table-td text-red-600">{fmt(r.advance_deduction + r.other_deduction)}</td>
                    <td className="table-td font-bold text-gray-900">{fmt(r.net_payable)}</td>
                    <td className="table-td font-semibold text-green-700">{paid > 0 ? fmt(paid) : '—'}</td>
                    <td className="table-td text-red-600">{remaining > 0 ? fmt(remaining) : '—'}</td>
                    <td className="table-td text-gray-500 text-xs">{r.payment_mode || '—'}</td>
                    <td className="table-td">{statusBadge(r)}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit Salary" onClick={() => openCalc(employees.find(e => e.id === r.employee_id) || { id: r.employee_id, name: r.name, role: r.role, base_salary: r.base_salary })}><Calculator size={14} /></button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Salary Slip PDF" onClick={() => generateSalarySlipPDF(r, month, year)}><FileText size={14} /></button>
                        {r.status !== 'paid' && (
                          <button className="p-1.5 hover:bg-green-50 text-green-700 rounded-lg" title="Record Payment" onClick={() => setPayRecord(r)}><CheckCircle size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {employees.length === 0 && (
        <div className="card text-center py-10 text-gray-500">No employees found. Add employees first.</div>
      )}
    </div>
  );
}
