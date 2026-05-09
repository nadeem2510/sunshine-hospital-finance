import * as XLSX from 'xlsx';

export function exportToExcel(data, monthName, year) {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Salary Summary ---
  const salaryRows = [
    ['SUNSHINE HOSPITAL - SALARY REPORT', '', '', '', '', '', '', '', '', ''],
    [`Month: ${monthName} ${year}`, '', '', '', '', '', '', '', '', ''],
    [],
    ['Employee Name', 'Emp ID', 'Role', 'Department', 'Base Salary', 'Days Worked', 'Gross Salary', 'Incentive', 'Advance Deduction', 'Other Deduction', 'Net Payable', 'Payment Mode', 'Payment Date', 'Status'],
    ...data.salaries.map(s => [
      s.name, s.emp_code, s.role, s.department,
      s.base_salary, s.days_worked, s.gross_salary, s.incentive,
      s.advance_deduction, s.other_deduction, s.net_payable,
      s.payment_mode, s.payment_date, s.status
    ]),
    [],
    ['TOTAL', '', '', '',
      data.salaries.reduce((a, s) => a + (s.base_salary || 0), 0), '',
      data.salaries.reduce((a, s) => a + (s.gross_salary || 0), 0),
      data.salaries.reduce((a, s) => a + (s.incentive || 0), 0),
      data.salaries.reduce((a, s) => a + (s.advance_deduction || 0), 0),
      data.salaries.reduce((a, s) => a + (s.other_deduction || 0), 0),
      data.salaries.reduce((a, s) => a + (s.net_payable || 0), 0),
      '', '', ''
    ]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(salaryRows);
  ws1['!cols'] = [22, 12, 14, 16, 14, 12, 14, 12, 18, 16, 14, 14, 14, 10].map(w => ({ wch: w }));
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Salary Report');

  // --- Sheet 2: Vendor Payments ---
  const vendorRows = [
    ['SUNSHINE HOSPITAL - VENDOR PAYMENTS', '', '', '', '', '', '', ''],
    [`Month: ${monthName} ${year}`, '', '', '', '', '', '', ''],
    [],
    ['Vendor Name', 'Category', 'Invoice Number', 'Invoice Date', 'Total Amount', 'Amount Paid', 'Payment Date', 'Payment Mode'],
    ...data.vendor_payments.map(p => [
      p.vendor_name, p.contact_category, p.invoice_number, p.invoice_date,
      p.total_amount, p.paid_amount, p.payment_date, p.payment_mode
    ]),
    [],
    ['TOTAL', '', '', '',
      data.vendor_payments.reduce((a, p) => a + (p.total_amount || 0), 0),
      data.vendor_payments.reduce((a, p) => a + (p.paid_amount || 0), 0),
      '', ''
    ]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(vendorRows);
  ws2['!cols'] = [24, 18, 16, 14, 14, 14, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Vendor Payments');

  const filename = `Sunshine_Finance_${monthName}_${year}.xlsx`;
  XLSX.writeFile(wb, filename);
}
