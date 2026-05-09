import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Edit2, ChevronDown, ChevronUp, Receipt, CreditCard, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Medical Supplies', 'Maintenance', 'Food & Catering', 'Oxygen', 'Laundry', 'Pharmacy', 'Lab Reagents', 'IT & Equipment', 'Security', 'Other'];
const PAY_MODES = ['Cash', 'Cheque', 'Online/NEFT', 'UPI'];

function VendorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', contact_category: 'Medical Supplies', contact_person: '', phone: '', email: '',
    address: '', gst_number: '', bank_account: '', bank_name: '', ifsc_code: ''
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Vendor Name *</label><input className="input" value={form.name} onChange={e => f('name', e.target.value)} required /></div>
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.contact_category} onChange={e => f('contact_category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Contact Person</label><input className="input" value={form.contact_person} onChange={e => f('contact_person', e.target.value)} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
        <div><label className="label">GST Number</label><input className="input" value={form.gst_number} onChange={e => f('gst_number', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={e => f('address', e.target.value)} /></div>
        <div><label className="label">Bank Account</label><input className="input" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} /></div>
        <div><label className="label">Bank Name</label><input className="input" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} /></div>
        <div><label className="label">IFSC Code</label><input className="input" value={form.ifsc_code} onChange={e => f('ifsc_code', e.target.value)} /></div>
      </div>
      <div className="flex gap-3"><button type="submit" className="btn-primary">Save Vendor</button><button type="button" className="btn-outline" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function InvoicePanel({ vendor }) {
  const [invoices, setInvoices] = useState([]);
  const [addingInv, setAddingInv] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [payments, setPayments] = useState([]);
  const [addingPay, setAddingPay] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [invForm, setInvForm] = useState({ invoice_number: '', invoice_date: today, due_date: '', total_amount: '', advance_paid: '', description: '' });
  const [payForm, setPayForm] = useState({ payment_date: today, amount: '', payment_mode: 'Online/NEFT', reference_number: '', notes: '' });

  const loadInvoices = () => api.getInvoices(vendor.id).then(setInvoices);
  const loadPayments = (invId) => api.getVendorPayments(invId).then(setPayments);

  useEffect(() => { loadInvoices(); }, [vendor.id]);

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    await api.createInvoice(vendor.id, invForm);
    setAddingInv(false);
    setInvForm({ invoice_number: '', invoice_date: today, due_date: '', total_amount: '', advance_paid: '', description: '' });
    loadInvoices();
  };

  const handleSelectInv = (inv) => {
    if (selectedInv?.id === inv.id) { setSelectedInv(null); return; }
    setSelectedInv(inv);
    loadPayments(inv.id);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    await api.addVendorPayment(selectedInv.id, { ...payForm, vendor_id: vendor.id });
    setAddingPay(false);
    setPayForm({ payment_date: today, amount: '', payment_mode: 'Online/NEFT', reference_number: '', notes: '' });
    loadInvoices();
    loadPayments(selectedInv.id);
  };

  const isOverdue = (inv) => inv.due_date && inv.status !== 'paid' && new Date(inv.due_date) < new Date();
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Receipt size={15} /> Invoices ({invoices.length})</p>
        <button className="btn-outline text-xs py-1.5" onClick={() => setAddingInv(!addingInv)}>+ Add Invoice</button>
      </div>

      {addingInv && (
        <form onSubmit={handleAddInvoice} className="p-3 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="label text-xs">Invoice No.</label><input className="input" value={invForm.invoice_number} onChange={e => setInvForm(p => ({ ...p, invoice_number: e.target.value }))} required /></div>
            <div><label className="label text-xs">Invoice Date</label><input type="date" className="input" value={invForm.invoice_date} onChange={e => setInvForm(p => ({ ...p, invoice_date: e.target.value }))} required /></div>
            <div><label className="label text-xs">Due Date</label><input type="date" className="input" value={invForm.due_date} onChange={e => setInvForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div><label className="label text-xs">Total Amount (₹)</label><input type="number" className="input" value={invForm.total_amount} onChange={e => setInvForm(p => ({ ...p, total_amount: e.target.value }))} required /></div>
            <div><label className="label text-xs">Advance Paid (₹)</label><input type="number" className="input" value={invForm.advance_paid} onChange={e => setInvForm(p => ({ ...p, advance_paid: e.target.value }))} /></div>
            <div><label className="label text-xs">Description</label><input className="input" value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2"><button type="submit" className="btn-primary text-xs py-1.5">Save Invoice</button><button type="button" className="btn-outline text-xs py-1.5" onClick={() => setAddingInv(false)}>Cancel</button></div>
        </form>
      )}

      {invoices.length === 0 && <p className="text-xs text-gray-400">No invoices yet</p>}
      <div className="space-y-2">
        {invoices.map(inv => (
          <div key={inv.id} className={`rounded-lg border ${isOverdue(inv) ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => handleSelectInv(inv)}>
              {isOverdue(inv) && <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{inv.invoice_number}</span>
                  <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>{inv.status}</span>
                  {isOverdue(inv) && <span className="badge-red">Overdue</span>}
                </div>
                <p className="text-xs text-gray-500">Date: {inv.invoice_date} {inv.due_date && `· Due: ${inv.due_date}`}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{fmt(inv.total_amount)}</p>
                {inv.remaining_balance > 0 && <p className="text-xs text-red-600">Remaining: {fmt(inv.remaining_balance)}</p>}
              </div>
            </div>

            {selectedInv?.id === inv.id && (
              <div className="border-t border-gray-100 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><CreditCard size={13} /> Payment History</p>
                  {inv.status !== 'paid' && (
                    <button className="btn-success text-xs py-1.5" onClick={() => setAddingPay(!addingPay)}>+ Record Payment</button>
                  )}
                </div>

                {addingPay && (
                  <form onSubmit={handleAddPayment} className="p-3 bg-green-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><label className="label text-xs">Date</label><input type="date" className="input" value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} required /></div>
                      <div><label className="label text-xs">Amount (₹)</label><input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} required /></div>
                      <div>
                        <label className="label text-xs">Payment Mode</label>
                        <select className="input" value={payForm.payment_mode} onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                          {PAY_MODES.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div><label className="label text-xs">Reference No.</label><input className="input" value={payForm.reference_number} onChange={e => setPayForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
                      <div><label className="label text-xs">Notes</label><input className="input" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2"><button type="submit" className="btn-success text-xs py-1.5">Record</button><button type="button" className="btn-outline text-xs py-1.5" onClick={() => setAddingPay(false)}>Cancel</button></div>
                  </form>
                )}

                {payments.length === 0 ? <p className="text-xs text-gray-400">No payments recorded</p> : (
                  <div className="space-y-1">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 text-xs">
                        <div>
                          <span className="font-medium">{fmt(p.amount)}</span>
                          <span className="text-gray-500 ml-2">{p.payment_date}</span>
                          <span className="badge-blue ml-2">{p.payment_mode}</span>
                        </div>
                        {p.reference_number && <span className="text-gray-400">{p.reference_number}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => api.getVendors().then(setVendors).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing) await api.updateVendor(editing.id, form);
      else await api.createVendor(form);
      setShowForm(false); setEditing(null); load();
    } catch (e) { setError(e.message); }
  };

  const filtered = vendors.filter(v =>
    (!search || v.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || v.contact_category === catFilter)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-48" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary ml-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={18} /> Add Vendor
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Vendor' : 'New Vendor'}</h3>
          <VendorForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && <div className="card text-center text-gray-500 py-10">No vendors found</div>}
        {filtered.map(vendor => (
          <div key={vendor.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-700 font-bold text-lg">
                {vendor.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{vendor.name}</p>
                  <span className="badge-blue">{vendor.contact_category}</span>
                </div>
                <p className="text-xs text-gray-500">{vendor.contact_person && `${vendor.contact_person} · `}{vendor.phone || 'No phone'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => { setEditing(vendor); setShowForm(true); }}><Edit2 size={16} /></button>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setExpanded(expanded === vendor.id ? null : vendor.id)}>
                  {expanded === vendor.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {expanded === vendor.id && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
                  <div><p className="text-xs text-gray-500">GST</p><p>{vendor.gst_number || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Bank</p><p>{vendor.bank_name || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">IFSC</p><p>{vendor.ifsc_code || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Email</p><p className="truncate">{vendor.email || '—'}</p></div>
                </div>
                <InvoicePanel vendor={vendor} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
