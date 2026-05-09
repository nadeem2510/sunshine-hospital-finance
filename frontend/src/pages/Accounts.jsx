import { useState, useEffect } from 'react';
import { api } from '../api';
import { Download, TrendingDown, AlertTriangle, Search, Users, ShoppingCart } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ROLES = ['Doctor', 'Nursing', 'Housekeeping', 'Administration', 'Pharmacy', 'Lab', 'Other'];
const CATEGORIES = ['Medical Supplies', 'Maintenance', 'Food & Catering', 'Oxygen', 'Laundry', 'Pharmacy', 'Lab Reagents', 'IT & Equipment', 'Security', 'Other'];

export default function Accounts() {
  const now = new Date();
  const [tab, setTab] = useState('summary');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [advances, setAdvances] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyType, setHistoryType] = useState('staff');
  const [historyFilter, setHistoryFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    api.getMonthlySummary(month, year).then(setSummary).catch(() => {});
  }, [month, year]);

  useEffect(() => {
    if (tab === 'advances') api.getPendingAdvances().then(setAdvances).catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (tab === 'history') {
      const params = { type: historyType, month, year };
      if (historyFilter) params.filter = historyFilter;
      api.getPaymentHistory(params).then(setHistory).catch(() => {});
    }
  }, [tab, historyType, historyFilter, month, year]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await api.getExportData(month, year);
      exportToExcel(data, MONTHS[month - 1], year);
    } catch (e) { alert('Export failed: ' + e.message); }
    finally { setLoading(false); }
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <select className="input w-40" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-28" value={year} onChange={e => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn-success ml-auto" onClick={handleExport} disabled={loading}>
          <Download size={16} /> {loading ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        <TabBtn id="summary" label="Monthly Summary" />
        <TabBtn id="advances" label="Pending Advances" />
        <TabBtn id="history" label="Payment History" />
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && summary && (
        <div className="space-y-4">
          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Total Outflow</p>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_outflow)}</p>
              <p className="text-xs text-blue-500">{SHORT[month - 1]} {year}</p>
            </div>
            <div className="card bg-green-50 border-green-100">
              <p className="text-xs text-green-600 font-medium">Salary Paid</p>
              <p className="text-2xl font-bold text-green-900">{fmt(summary.salary_paid)}</p>
              <p className="text-xs text-green-500">Processed salaries</p>
            </div>
            <div className="card bg-yellow-50 border-yellow-100">
              <p className="text-xs text-yellow-600 font-medium">Salary Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{fmt(summary.salary_pending)}</p>
              <p className="text-xs text-yellow-500">Draft salaries</p>
            </div>
            <div className="card bg-purple-50 border-purple-100">
              <p className="text-xs text-purple-600 font-medium">Vendor Payments</p>
              <p className="text-2xl font-bold text-purple-900">{fmt(summary.vendor_paid)}</p>
              <p className="text-xs text-purple-500">This month</p>
            </div>
          </div>

          {/* By Role */}
          {summary.by_role?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users size={18} /> Salary by Role</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">Role</th><th className="table-th">Employees</th><th className="table-th">Total Payable</th>
                  </tr></thead>
                  <tbody>
                    {summary.by_role.map(r => (
                      <tr key={r.role} className="border-b border-gray-50">
                        <td className="table-td font-medium">{r.role}</td>
                        <td className="table-td">{r.count}</td>
                        <td className="table-td font-semibold text-green-700">{fmt(r.total_payable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Vendor Category */}
          {summary.by_vendor_category?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><ShoppingCart size={18} /> Vendor Payments by Category</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">Category</th><th className="table-th">Vendors</th><th className="table-th">Total Paid</th>
                  </tr></thead>
                  <tbody>
                    {summary.by_vendor_category.map(c => (
                      <tr key={c.contact_category} className="border-b border-gray-50">
                        <td className="table-td font-medium">{c.contact_category}</td>
                        <td className="table-td">{c.vendor_count}</td>
                        <td className="table-td font-semibold text-purple-700">{fmt(c.total_paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADVANCES TAB */}
      {tab === 'advances' && advances && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" /> Employee Advances Pending</h3>
            {advances.employee_advances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No pending employee advances</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">Employee</th><th className="table-th">Role</th>
                    <th className="table-th">Advance Amount</th><th className="table-th">Repaid</th>
                    <th className="table-th">Pending</th><th className="table-th">Date</th><th className="table-th">Status</th>
                  </tr></thead>
                  <tbody>
                    {advances.employee_advances.map(a => {
                      const pending = a.amount - a.repaid_amount;
                      const isHigh = pending > 0;
                      return (
                        <tr key={a.id} className={`border-b border-gray-50 ${isHigh ? 'bg-yellow-50' : ''}`}>
                          <td className="table-td font-medium">{a.employee_name}</td>
                          <td className="table-td">{a.role}</td>
                          <td className="table-td">{fmt(a.amount)}</td>
                          <td className="table-td text-green-700">{fmt(a.repaid_amount)}</td>
                          <td className="table-td font-bold text-red-700">{fmt(pending)}</td>
                          <td className="table-td">{a.request_date}</td>
                          <td className="table-td"><span className={`badge ${a.repayment_status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>{a.repayment_status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-500" /> Vendor Advances (Partial Invoices)</h3>
            {advances.vendor_advances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No pending vendor advances</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">Vendor</th><th className="table-th">Category</th>
                    <th className="table-th">Invoice</th><th className="table-th">Total</th>
                    <th className="table-th">Advance Paid</th><th className="table-th">Remaining</th><th className="table-th">Status</th>
                  </tr></thead>
                  <tbody>
                    {advances.vendor_advances.map(v => (
                      <tr key={v.id} className="border-b border-gray-50">
                        <td className="table-td font-medium">{v.vendor_name}</td>
                        <td className="table-td">{v.contact_category}</td>
                        <td className="table-td">{v.invoice_number}</td>
                        <td className="table-td">{fmt(v.total_amount)}</td>
                        <td className="table-td text-green-700">{fmt(v.advance_paid)}</td>
                        <td className="table-td font-bold text-red-700">{fmt(v.remaining_balance)}</td>
                        <td className="table-td"><span className={`badge ${v.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>{v.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => { setHistoryType('staff'); setHistoryFilter(''); }} className={`px-3 py-1.5 text-sm rounded-md transition-all ${historyType === 'staff' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}>Staff</button>
              <button onClick={() => { setHistoryType('vendor'); setHistoryFilter(''); }} className={`px-3 py-1.5 text-sm rounded-md transition-all ${historyType === 'vendor' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}>Vendors</button>
            </div>
            <select className="input w-48" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
              <option value="">All {historyType === 'staff' ? 'Roles' : 'Categories'}</option>
              {(historyType === 'staff' ? ROLES : CATEGORIES).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>

          <div className="card overflow-x-auto">
            {historyType === 'staff' ? (
              <table className="w-full min-w-[600px]">
                <thead><tr className="border-b border-gray-100">
                  <th className="table-th">Employee</th><th className="table-th">Role</th>
                  <th className="table-th">Period</th><th className="table-th">Days</th>
                  <th className="table-th">Net Paid</th><th className="table-th">Mode</th><th className="table-th">Status</th>
                </tr></thead>
                <tbody>
                  {history.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No records</td></tr>}
                  {history.map(r => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="table-td font-medium">{r.name}</td>
                      <td className="table-td">{r.role}</td>
                      <td className="table-td">{SHORT[r.month - 1]} {r.year}</td>
                      <td className="table-td">{r.days_worked}</td>
                      <td className="table-td font-semibold text-green-700">₹{r.net_payable?.toLocaleString('en-IN')}</td>
                      <td className="table-td">{r.payment_mode || '—'}</td>
                      <td className="table-td"><span className={`badge ${r.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[700px]">
                <thead><tr className="border-b border-gray-100">
                  <th className="table-th">Vendor</th><th className="table-th">Category</th>
                  <th className="table-th">Invoice</th><th className="table-th">Date</th>
                  <th className="table-th">Amount Paid</th><th className="table-th">Mode</th>
                </tr></thead>
                <tbody>
                  {history.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No records</td></tr>}
                  {history.map(r => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="table-td font-medium">{r.vendor_name}</td>
                      <td className="table-td">{r.contact_category}</td>
                      <td className="table-td">{r.invoice_number}</td>
                      <td className="table-td">{r.payment_date}</td>
                      <td className="table-td font-semibold text-purple-700">₹{r.amount?.toLocaleString('en-IN')}</td>
                      <td className="table-td">{r.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
