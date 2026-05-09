import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, TrendingDown, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-red-100 text-red-700',    icon: AlertCircle },
  partial:  { label: 'Partial',  color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  settled:  { label: 'Settled',  color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

function AddAdvanceModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({
    employee_id: '',
    request_date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedEmp = employees.find(e => String(e.id) === String(form.employee_id));
  const salaryWarning = selectedEmp && form.amount &&
    parseFloat(form.amount) > (selectedEmp.base_salary || 0) * 0.5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return setError('Please select an employee');
    setSaving(true);
    setError('');
    try {
      await api.createAdvance(form.employee_id, {
        request_date: form.request_date,
        amount: parseFloat(form.amount),
        reason: form.reason,
        month: form.month,
        year: form.year,
      });
      onSave();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Add Advance</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</p>}

          <div>
            <label className="label">Employee *</label>
            <select className="input" value={form.employee_id} onChange={e => f('employee_id', e.target.value)} required>
              <option value="">— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id}) · {emp.role}
                </option>
              ))}
            </select>
            {selectedEmp && (
              <p className="text-xs text-gray-500 mt-1">
                Base Salary: ₹{(selectedEmp.base_salary || 0).toLocaleString('en-IN')} &nbsp;·&nbsp;
                50% limit: ₹{((selectedEmp.base_salary || 0) * 0.5).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.request_date} onChange={e => f('request_date', e.target.value)} required />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" min="1" className="input" value={form.amount} onChange={e => f('amount', e.target.value)} required />
              {salaryWarning && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> Exceeds 50% of base salary
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">For Month</label>
              <select className="input" value={form.month} onChange={e => f('month', parseInt(e.target.value))}>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" className="input" value={form.year} onChange={e => f('year', parseInt(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <input className="input" placeholder="Medical, personal, etc." value={form.reason} onChange={e => f('reason', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Advance'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettleModal({ advance, onSave, onClose }) {
  const pending = advance.amount - (advance.repaid_amount || 0);
  const [amount, setAmount] = useState(String(pending));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.settleAdvance(advance.id, { repaid_amount: parseFloat(amount), repaid_date: date });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Settle Advance</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-yellow-50 rounded-lg text-sm">
            <p className="font-medium text-gray-800">{advance.employee_name}</p>
            <p className="text-gray-600">Total: ₹{advance.amount.toLocaleString('en-IN')} · Pending: ₹{pending.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <label className="label">Repayment Amount (₹)</label>
            <input type="number" min="1" max={pending} className="input" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Repayment Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Confirm Settlement'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Advances() {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [settling, setSettling] = useState(null);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.getAllAdvances(), api.getEmployees()])
      .then(([adv, emp]) => { setAdvances(adv); setEmployees(emp); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = advances.filter(a => {
    if (filterStatus && a.repayment_status !== filterStatus) return false;
    if (filterEmp && String(a.employee_id) !== filterEmp) return false;
    if (search && !a.employee_name.toLowerCase().includes(search.toLowerCase()) &&
        !a.emp_code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPending = advances
    .filter(a => a.repayment_status !== 'settled')
    .reduce((s, a) => s + (a.amount - (a.repaid_amount || 0)), 0);

  const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Advances</p>
          <p className="text-xl font-bold text-gray-900">₹{totalAdvances.toLocaleString('en-IN')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Pending Recovery</p>
          <p className="text-xl font-bold text-red-600">₹{totalPending.toLocaleString('en-IN')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Active Advances</p>
          <p className="text-xl font-bold text-orange-600">{advances.filter(a => a.repayment_status !== 'settled').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Settled</p>
          <p className="text-xl font-bold text-green-600">{advances.filter(a => a.repayment_status === 'settled').length}</p>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-44" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="settled">Settled</option>
        </select>
        <button className="btn-primary ml-auto" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Advance
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-10 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <TrendingDown size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No advances found</p>
          <p className="text-gray-400 text-sm mt-1">Click "+ Add Advance" to record one</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Month</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Repaid</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Pending</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Reason</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  const pending = a.amount - (a.repaid_amount || 0);
                  const cfg = STATUS_CONFIG[a.repayment_status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const isHighAdvance = a.base_salary && a.amount > a.base_salary * 0.5;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.employee_name}</p>
                        <p className="text-xs text-gray-400">{a.emp_code} · {a.role}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.request_date}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {a.month ? `${MONTHS[a.month - 1]} ${a.year}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ₹{a.amount.toLocaleString('en-IN')}
                        {isHighAdvance && <span className="ml-1 text-orange-500" title="Exceeds 50% of salary">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {a.repaid_amount ? `₹${a.repaid_amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {pending > 0 ? `₹${pending.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{a.reason || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon size={11} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.repayment_status !== 'settled' && (
                          <button
                            onClick={() => setSettling(a)}
                            className="btn-outline text-xs py-1 px-3 whitespace-nowrap"
                          >
                            Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddAdvanceModal
          employees={employees}
          onSave={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {settling && (
        <SettleModal
          advance={settling}
          onSave={() => { setSettling(null); load(); }}
          onClose={() => setSettling(null)}
        />
      )}
    </div>
  );
}
