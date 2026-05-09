const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data) => req('/auth/login', { method: 'POST', body: data }),
  changePassword: (data) => req('/auth/change-password', { method: 'POST', body: data }),

  // Employees
  getEmployees: () => req('/employees'),
  getAllEmployees: () => req('/employees/all'),
  getEmployee: (id) => req(`/employees/${id}`),
  createEmployee: (data) => req('/employees', { method: 'POST', body: data }),
  updateEmployee: (id, data) => req(`/employees/${id}`, { method: 'PUT', body: data }),
  deleteEmployee: (id) => req(`/employees/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (empId) => req(`/employees/${empId}/attendance`),
  saveAttendance: (empId, data) => req(`/employees/${empId}/attendance`, { method: 'POST', body: data }),

  // Advances
  getNextEmployeeId: () => req('/employees/next-id'),
  getAllAdvances: () => req('/employees/advances/all'),
  getAdvances: (empId) => req(`/employees/${empId}/advances`),
  createAdvance: (empId, data) => req(`/employees/${empId}/advances`, { method: 'POST', body: data }),
  settleAdvance: (advId, data) => req(`/employees/advances/${advId}/settle`, { method: 'PUT', body: data }),

  // Payroll
  getPayroll: (month, year) => req(`/payroll?month=${month}&year=${year}`),
  getPayrollRecord: (empId, month, year) => req(`/payroll/${empId}/${month}/${year}`),
  calculateSalary: (data) => req('/payroll/calculate', { method: 'POST', body: data }),
  markPaid: (id, data) => req(`/payroll/${id}/pay`, { method: 'PUT', body: data }),
  getPayrollSummary: (month, year) => req(`/payroll/summary/${month}/${year}`),

  // Vendors
  getVendors: () => req('/vendors'),
  getVendor: (id) => req(`/vendors/${id}`),
  createVendor: (data) => req('/vendors', { method: 'POST', body: data }),
  updateVendor: (id, data) => req(`/vendors/${id}`, { method: 'PUT', body: data }),
  deleteVendor: (id) => req(`/vendors/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (vendorId) => req(`/vendors/${vendorId}/invoices`),
  createInvoice: (vendorId, data) => req(`/vendors/${vendorId}/invoices`, { method: 'POST', body: data }),
  updateInvoice: (invoiceId, data) => req(`/vendors/invoices/${invoiceId}`, { method: 'PUT', body: data }),

  // Vendor Payments
  getVendorPayments: (invoiceId) => req(`/vendors/invoices/${invoiceId}/payments`),
  addVendorPayment: (invoiceId, data) => req(`/vendors/invoices/${invoiceId}/payments`, { method: 'POST', body: data }),

  // Accounts
  getMonthlySummary: (month, year) => req(`/accounts/monthly-summary/${month}/${year}`),
  getPendingAdvances: () => req('/accounts/pending-advances'),
  getAlerts: () => req('/accounts/alerts'),
  getPaymentHistory: (params) => req(`/accounts/payment-history?${new URLSearchParams(params)}`),
  getExportData: (month, year) => req(`/accounts/export/${month}/${year}`)
};
