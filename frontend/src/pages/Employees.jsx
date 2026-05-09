import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';

const ROLES = ['Doctor', 'Nursing', 'Housekeeping', 'Administration', 'Pharmacy', 'Lab', 'Other'];

function EmployeeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', employee_id: '', role: 'Nursing', department: '', joining_date: '',
    base_salary: '', phone: '', email: '', bank_account: '', bank_name: '', ifsc_code: '',
    pay_type: 'monthly', per_visit_rate: ''
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!initial) {
      api.getNextEmployeeId().then(data => f('employee_id', data.employee_id)).catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => f('name', e.target.value)} required /></div>
        <div>
          <label className="label">Employee ID *</label>
          <div className="relative">
            <input className="input bg-gray-50 font-mono" value={form.employee_id} readOnly={!initial} onChange={e => f('employee_id', e.target.value)} required />
            {!initial && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Auto</span>}
          </div>
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input" value={form.role} onChange={e => f('role', e.target.value)} required>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => f('department', e.target.value)} /></div>
        <div><label className="label">Joining Date</label><input type="date" className="input" value={form.joining_date} onChange={e => f('joining_date', e.target.value)} /></div>
        <div>
          <label className="label">Pay Type</label>
          <select className="input" value={form.pay_type} onChange={e => f('pay_type', e.target.value)}>
            <option value="monthly">Monthly Fixed</option>
            <option value="per_visit">Per Visit</option>
          </select>
        </div>
        <div><label className="label">Monthly Base Salary (₹) *</label><input type="number" className="input" value={form.base_salary} onChange={e => f('base_salary', e.target.value)} required /></div>
        {form.pay_type === 'per_visit' && (
          <div><label className="label">Per Visit Rate (₹)</label><input type="number" className="input" value={form.per_visit_rate} onChange={e => f('per_visit_rate', e.target.value)} /></div>
        )}
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Bank Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="label">Account Number</label><input className="input" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} /></div>
        <div><label className="label">Bank Name</label><input className="input" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} /></div>
        <div><label className="label">IFSC Code</label><input className="input" value={form.ifsc_code} onChange={e => f('ifsc_code', e.target.value)} /></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary">Save Employee</button>
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AdvancePanel({ empId }) {
  const [advances, setAdvances] = useState([]);
  const [form, setForm] = useState({ request_date: new Date().toISOString().split('T')[0], amount: '', reason: '' });
  const [adding, setAdding] = useState(false);

  const load = () => api.getAdvances(empId).then(setAdvances);
  useEffect(() => { load(); }, [empId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await api.createAdvance(empId, form);
    setAdding(false);
    setForm({ request_date: new Date().toISOString().split('T')[0], amount: '', reason: '' });
    load();
  };

  const handleSettle = async (adv) => {
    const amt = prompt(`Settle advance for ₹${adv.amount - adv.repaid_amount} pending. Enter amount to repay:`);
    if (!amt) return;
    await api.settleAdvance(adv.id, { repaid_amount: parseFloat(amt), repaid_date: new Date().toISOString().split('T')[0] });
    load();
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Advances</p>
        <button className="btn-outline text-xs py-1.5" onClick={() => setAdding(!adding)}>+ Add Advance</button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
          <div><label className="label text-xs">Date</label><input type="date" className="input" value={form.request_date} onChange={e => setForm(p => ({ ...p, request_date: e.target.value }))} required /></div>
          <div><label className="label text-xs">Amount (₹)</label><input type="number" className="input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
          <div><label className="label text-xs">Reason</label><input className="input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
          <div className="sm:col-span-3 flex gap-2"><button type="submit" className="btn-primary text-xs py-1.5">Save</button><button type="button" className="btn-outline text-xs py-1.5" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}
      {advances.length === 0 ? <p className="text-xs text-gray-400">No advances recorded</p> : (
        <div className="space-y-2">
          {advances.map(a => (
            <div key={a.id} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${a.repayment_status === 'settled' ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div>
                <span className="font-medium">₹{a.amount.toLocaleString('en-IN')}</span>
                <span className="text-gray-500 ml-2">{a.request_date}</span>
                {a.reason && <span className="text-gray-500 ml-2">— {a.reason}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${a.repayment_status === 'settled' ? 'badge-green' : a.repayment_status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>{a.repayment_status}</span>
                {a.repayment_status !== 'settled' && (
                  <button className="btn-outline text-xs py-1 px-2" onClick={() => handleSettle(a)}>Settle</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => api.getEmployees().then(setEmployees).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing) await api.updateEmployee(editing.id, form);
      else await api.createEmployee(form);
      setShowForm(false); setEditing(null); load();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this employee?')) return;
    await api.deleteEmployee(id);
    load();
  };

  const filtered = employees.filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || e.role === roleFilter)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button className="btn-primary ml-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={18} /> Add Employee
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Employee' : 'New Employee'}</h3>
          <EmployeeForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && <div className="card text-center text-gray-500 py-10">No employees found</div>}
        {filtered.map(emp => (
          <div key={emp.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{emp.name}</p>
                  <span className="badge-blue">{emp.role}</span>
                  {emp.pay_type === 'per_visit' && <span className="badge-gray">Per Visit</span>}
                </div>
                <p className="text-xs text-gray-500">{emp.employee_id} {emp.department && `· ${emp.department}`}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-bold text-gray-900">₹{(emp.base_salary || 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500">Base/month</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => { setEditing(emp); setShowForm(true); }}><Edit2 size={16} /></button>
                <button className="p-2 rounded-lg hover:bg-red-50 text-red-500" onClick={() => handleDelete(emp.id)}><Trash2 size={16} /></button>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}>
                  {expanded === emp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {expanded === emp.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  <div><p className="text-xs text-gray-500">Phone</p><p>{emp.phone || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Email</p><p className="truncate">{emp.email || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Joining Date</p><p>{emp.joining_date || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Bank</p><p>{emp.bank_name || '—'}</p></div>
                </div>
                <AdvancePanel empId={emp.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
