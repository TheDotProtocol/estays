import PDFDocument from 'pdfkit';
import { ESTAYS_COMPANY } from '@estays/shared';
import { parseDecimal } from '../utils/helpers';

type PayslipDoc = {
  employeeName: string;
  employeeCode: string;
  designation: string;
  hotelName: string;
  periodStart: string;
  periodEnd: string;
  daysPresent: number;
  daysAbsent: number;
  grossSalary: unknown;
  totalDeductions: unknown;
  netSalary: unknown;
  deductions: { label: string; amount: number }[];
};

export function generatePayslipPdf(doc: PayslipDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fillColor('#1a2b4a').fontSize(18).font('Helvetica-Bold').text('E Stays Hotels', 50, 50);
    pdf.fontSize(14).text('Payslip', 50, 80);
    pdf.fontSize(10).font('Helvetica').fillColor('#333');
    pdf.text(`Employee: ${doc.employeeName} (${doc.employeeCode})`, 50, 110);
    pdf.text(`Designation: ${doc.designation}`, 50, 125);
    pdf.text(`Property: ${doc.hotelName}`, 50, 140);
    pdf.text(`Period: ${doc.periodStart} to ${doc.periodEnd}`, 50, 155);
    pdf.text(`Days present: ${doc.daysPresent} · Absent: ${doc.daysAbsent}`, 50, 170);

    let y = 200;
    pdf.font('Helvetica-Bold').text('Deductions', 50, y);
    y += 18;
    pdf.font('Helvetica');
    for (const d of doc.deductions) {
      pdf.text(d.label, 50, y);
      pdf.text(d.amount.toFixed(2), 420, y);
      y += 16;
    }

    y += 20;
    pdf.font('Helvetica-Bold');
    pdf.text(`Gross: ${parseDecimal(doc.grossSalary).toFixed(2)}`, 50, y);
    y += 16;
    pdf.text(`Deductions: ${parseDecimal(doc.totalDeductions).toFixed(2)}`, 50, y);
    y += 16;
    pdf.fillColor('#1a2b4a').fontSize(12).text(`Net Pay: ${parseDecimal(doc.netSalary).toFixed(2)}`, 50, y);

    pdf.fontSize(8).fillColor('#999').font('Helvetica')
      .text(`${ESTAYS_COMPANY.name} — Confidential`, 50, 750, { align: 'center', width: 500 });

    pdf.end();
  });
}
