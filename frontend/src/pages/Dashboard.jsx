import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { TrendingDown, Users, AlertTriangle, CheckCircle, Clock, Building2 } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {});
    if (isAdmin) {
      api.getAlerts().then(setAlerts).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      api.getMonthlySummary(month, year).then(setSummary).catch(() => {});
    }
  }, [month, year, isAdmin]);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Welcome to Finance Manager</h2>
          <p className="text-sm text-gray-500">Sunshine Hospital — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <select className="input w-32" value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="input w-28" value={year} onChange={e => setYear(+e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Employees" value={employees.length} icon={Users} color="bg-blue-500" />
        {isAdmin && summary ? (
          <>
            <StatCard label="Salary Paid" value={fmt(summary.salary_paid)} icon={CheckCircle} color="bg-green-500" />
            <StatCard label="Salary Pending" value={fmt(summary.salary_pending)} icon={Clock} color="bg-yellow-500" />
            <StatCard label="Vendor Paid" value={fmt(summary.vendor_paid)} icon={TrendingDown} color="bg-purple-500" />
          </>
        ) : (
          <>
            <StatCard label="Salary Paid" value="—" icon={CheckCircle} color="bg-green-500" />
            <StatCard label="Salary Pending" value="—" icon={Clock} color="bg-yellow-500" />
            <StatCard label="Vendor Paid" value="—" icon={TrendingDown} color="bg-purple-500" />
          </>
        )}
      </div>

      {/* Alerts - Admin Only */}
      {isAdmin && alerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overdue Invoices */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-semibold text-gray-900">Overdue Vendor Invoices</h3>
              {alerts.overdue_invoices.length > 0 && (
                <span className="badge-red ml-auto">{alerts.overdue_invoices.length}</span>
              )}
            </div>
            {alerts.overdue_invoices.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No overdue invoices</p>
            ) : (
              <div className="space-y-2">
                {alerts.overdue_invoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.vendor_name}</p>
                      <p className="text-xs text-gray-500">{inv.invoice_number} · Due: {inv.due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-700">{fmt(inv.remaining_balance)}</p>
                      <span className="badge-red">Overdue</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* High Advances */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-yellow-500" />
              <h3 className="font-semibold text-gray-900">High Employee Advances (&gt;50% salary)</h3>
              {alerts.high_advances.length > 0 && (
                <span className="badge-yellow ml-auto">{alerts.high_advances.length}</span>
              )}
            </div>
            {alerts.high_advances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No high advances</p>
            ) : (
              <div className="space-y-2">
                {alerts.high_advances.map(adv => (
                  <div key={adv.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{adv.employee_name}</p>
                      <p className="text-xs text-gray-500">{adv.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-700">{fmt(adv.amount - adv.repaid_amount)}</p>
                      <span className="badge-yellow">{adv.advance_pct}% of salary</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary by Role */}
      {isAdmin && summary && summary.by_role?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={18} /> Salary Breakdown by Department — {MONTHS[month - 1]} {year}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Role</th>
                  <th className="table-th">Count</th>
                  <th className="table-th">Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_role.map(r => (
                  <tr key={r.role} className="border-b border-gray-50">
                    <td className="table-td font-medium">{r.role}</td>
                    <td className="table-td">{r.count}</td>
                    <td className="table-td font-semibold">{fmt(r.total_payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
