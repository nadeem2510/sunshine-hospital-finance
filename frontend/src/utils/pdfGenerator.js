import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function generateSalarySlipPDF(record, month, year) {
  const doc = new jsPDF();
  const monthName = MONTHS[month - 1];

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SUNSHINE HOSPITAL', 105, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Salary Slip', 105, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${monthName} ${year}`, 105, 30, { align: 'center' });

  // Employee Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const empData = [
    ['Employee Name', record.name || ''],
    ['Employee ID', record.emp_code || record.employee_id || ''],
    ['Role / Department', `${record.role || ''} ${record.department ? '/ ' + record.department : ''}`],
    ['Bank Name', record.bank_name || '—'],
    ['Payment Period', `${monthName} ${year}`],
    ['Days Worked', String(record.days_worked || 0)],
  ];

  doc.autoTable({
    startY: 52,
    body: empData,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 110 } },
    styles: { fontSize: 10, cellPadding: 3 },
    theme: 'plain',
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.3,
  });

  // Salary Breakdown
  const afterEmp = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Salary Breakdown', 14, afterEmp);

  const fmt = (n) => `Rs. ${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const salaryData = [
    ['EARNINGS', '', 'DEDUCTIONS', ''],
    ['Base Salary (Monthly)', fmt(record.base_salary), 'Advance Deduction', fmt(record.advance_deduction)],
    [`Proportional (${record.days_worked} days)`, fmt(record.gross_salary), 'Other Deductions', fmt(record.other_deduction)],
    ['Incentive / Bonus', fmt(record.incentive), '', ''],
    ['', '', '', ''],
    ['GROSS SALARY', fmt(record.gross_salary + (record.incentive || 0)), 'TOTAL DEDUCTIONS', fmt((record.advance_deduction || 0) + (record.other_deduction || 0))],
  ];

  doc.autoTable({
    startY: afterEmp + 4,
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body: salaryData.slice(1),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 40 }, 2: { cellWidth: 65 }, 3: { cellWidth: 40 } },
    theme: 'striped',
  });

  // Net Payable
  const afterTable = doc.lastAutoTable.finalY + 5;
  doc.setFillColor(240, 253, 244);
  doc.rect(14, afterTable, 182, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text('NET PAYABLE SALARY', 20, afterTable + 9);
  doc.text(fmt(record.net_payable), 196, afterTable + 9, { align: 'right' });

  // Payment Status
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (record.status === 'paid') {
    doc.text(`Payment Status: PAID  |  Mode: ${record.payment_mode || '—'}  |  Date: ${record.payment_date || '—'}`, 14, afterTable + 22);
  } else {
    doc.text('Payment Status: PENDING', 14, afterTable + 22);
  }

  // Notes
  if (record.notes) {
    doc.text(`Notes: ${record.notes}`, 14, afterTable + 30);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated salary slip. No signature required.', 105, 285, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 105, 290, { align: 'center' });

  doc.save(`SalarySlip_${record.name?.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`);
}
