import { useState, useEffect } from 'react';
import { api } from '../api';
import { Calculator, FileText, CheckCircle, Clock } from 'lucide-react';
import { generateSalarySlipPDF } from '../utils/pdfGenerator';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [calcForm, setCalcForm] = useState(null);
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

  const openCalc = (emp) => {
    const existing = records.find(r => r.employee_id === emp.id);
    setCalcForm({
      employee_id: emp.id,
      emp,
      days_worked: existing?.days_worked || 26,
      advance_deduction: existing?.advance_deduction || 0,
      incentive: existing?.incentive || 0,
      other_deduction: existing?.other_deduction || 0,
      notes: existing?.notes || '',
      existing
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

  const handleMarkPaid = async (record) => {
    const mode = prompt('Payment mode? (Cash / Cheque / Online)', 'Online');
    if (!mode) return;
    await api.markPaid(record.id, { payment_date: new Date().toISOString().split('T')[0], payment_mode: mode });
    load();
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
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold">Calculate Salary</h3>
              <p className="text-sm text-gray-500">{calcForm.emp.name} — {SHORT_MONTHS[month - 1]} {year}</p>
            </div>
            <form onSubmit={handleCalculate} className="p-5 space-y-4">
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
                  <label className="label">Advance Deduction (₹)</label>
                  <input type="number" className="input" value={calcForm.advance_deduction}
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
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Employee</th>
                <th className="table-th">Role</th>
                <th className="table-th">Days</th>
                <th className="table-th">Gross</th>
                <th className="table-th">Deductions</th>
                <th className="table-th">Net Payable</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="table-td font-medium">{r.name}<br /><span className="text-xs text-gray-400">{r.emp_code || r.employee_id}</span></td>
                  <td className="table-td">{r.role}</td>
                  <td className="table-td">{r.days_worked}</td>
                  <td className="table-td">{fmt(r.gross_salary)}</td>
                  <td className="table-td text-red-600">{fmt(r.advance_deduction + r.other_deduction)}</td>
                  <td className="table-td font-bold text-green-700">{fmt(r.net_payable)}</td>
                  <td className="table-td">
                    <span className={r.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{r.status}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit" onClick={() => openCalc(employees.find(e => e.id === r.employee_id) || { id: r.employee_id, name: r.name, role: r.role, base_salary: r.base_salary })}><Calculator size={14} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Salary Slip" onClick={() => generateSalarySlipPDF(r, month, year)}><FileText size={14} /></button>
                      {r.status !== 'paid' && (
                        <button className="p-1.5 hover:bg-green-50 text-green-700 rounded-lg" title="Mark Paid" onClick={() => handleMarkPaid(r)}><CheckCircle size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
