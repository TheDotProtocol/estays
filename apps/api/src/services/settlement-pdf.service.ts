import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ESTAYS_COMPANY, formatCompanyFooter, SETTLEMENT_TAX_DISCLAIMER } from '@estays/shared';
import { parseDecimal } from '../utils/helpers';

type SettlementDoc = {
  statementNumber: string;
  settlementDate: Date;
  periodStart: Date;
  periodEnd: Date;
  periodType?: string;
  status: string;
  bookingCount: number;
  paidOnlineTotal: unknown;
  payAtHotelTotal: unknown;
  refundsTotal: unknown;
  creditsTotal: unknown;
  debitsTotal: unknown;
  commissionTotal: unknown;
  taxTotal: unknown;
  netPayable: unknown;
  netReceivable: unknown;
  netSettlement: unknown;
  openingBalance: unknown;
  closingBalance: unknown;
  transactionRef?: string | null;
  hotel: { name: string; city?: string; country?: string };
  items: {
    entryType: string;
    description: string;
    grossAmount: unknown;
    commission: unknown;
    taxAmount?: unknown;
    netAmount: unknown;
  }[];
  taxLabel?: string;
  taxDisclaimer?: string;
};

function resolveLogoPath(): string | null {
  const candidates = [
    process.env.SETTLEMENT_LOGO_PATH,
    path.join(process.cwd(), 'assets/logo.png'),
    path.join(process.cwd(), '../web/public/images/logo.png'),
    path.resolve(__dirname, '../../assets/logo.png'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function drawBrandedHeader(doc: InstanceType<typeof PDFDocument>, title: string, subtitle?: string) {
  const logo = resolveLogoPath();
  if (logo) {
    try {
      doc.image(logo, 50, 45, { width: 56 });
    } catch {
      /* logo optional */
    }
  }

  doc
    .fillColor('#1a2744')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('E Stays Hotels', logo ? 120 : 50, 50);

  doc
    .fillColor('#c9a227')
    .fontSize(10)
    .font('Helvetica')
    .text(ESTAYS_COMPANY.tagline, logo ? 120 : 50, 74);

  doc
    .fillColor('#1a2744')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(title, 50, 110);

  if (subtitle) {
    doc.fillColor('#666').fontSize(10).font('Helvetica').text(subtitle, 50, 132);
  }

  doc
    .strokeColor('#e8dcc8')
    .lineWidth(1)
    .moveTo(50, 155)
    .lineTo(doc.page.width - 50, 155)
    .stroke();

  doc.y = 170;
}

function drawBrandedFooter(doc: InstanceType<typeof PDFDocument>) {
  const footerLines = formatCompanyFooter();
  const footerY = doc.page.height - 90;
  const width = doc.page.width - 100;

  doc
    .strokeColor('#e8dcc8')
    .lineWidth(0.5)
    .moveTo(50, footerY - 10)
    .lineTo(doc.page.width - 50, footerY - 10)
    .stroke();

  doc.fillColor('#888').fontSize(7).font('Helvetica');
  footerLines.forEach((line, i) => {
    doc.text(line, 50, footerY + i * 10, { width, align: 'center' });
  });
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed = 60) {
  if (doc.y + needed > doc.page.height - 100) {
    drawBrandedFooter(doc);
    doc.addPage();
    doc.y = 50;
  }
}

export class SettlementPdfService {
  async writeStatementPdf(settlement: SettlementDoc, outputPath: string, taxLabel?: string) {
    await this.renderPdf(outputPath, (doc) => {
      const period =
        settlement.periodType === 'WEEKLY'
          ? `Week: ${settlement.periodStart.toISOString().slice(0, 10)} — ${settlement.periodEnd.toISOString().slice(0, 10)}`
          : `Date: ${settlement.settlementDate.toISOString().slice(0, 10)}`;

      drawBrandedHeader(
        doc,
        'Settlement Statement',
        `${settlement.statementNumber} · ${settlement.hotel.name} · ${period}`
      );

      doc.fillColor('#333').fontSize(10).font('Helvetica');
      doc.text(`Status: ${settlement.status}  |  Bookings: ${settlement.bookingCount}`);
      if (settlement.hotel.country) {
        doc.text(`Property: ${settlement.hotel.city || ''}, ${settlement.hotel.country}`);
      }
      doc.moveDown(0.5);

      // Table header
      const colX = [50, 120, 300, 370, 440, 500];
      doc.font('Helvetica-Bold').fontSize(8);
      ['Type', 'Description', 'Gross', 'Comm.', taxLabel || 'Tax', 'Net'].forEach((h, i) => {
        doc.text(h, colX[i], doc.y, { width: i === 1 ? 170 : 60 });
      });
      doc.moveDown(0.8);
      doc.font('Helvetica').fontSize(8);

      for (const item of settlement.items) {
        ensureSpace(doc, 20);
        const y = doc.y;
        const comm = parseDecimal(item.commission);
        const tax = parseDecimal(item.taxAmount);
        doc.text(item.entryType, colX[0], y, { width: 65 });
        doc.text(item.description.slice(0, 40), colX[1], y, { width: 170 });
        doc.text(parseDecimal(item.grossAmount).toFixed(2), colX[2], y);
        doc.text(comm.toFixed(2), colX[3], y);
        doc.text(tax > 0 ? tax.toFixed(2) : '0.00', colX[4], y);
        doc.text(parseDecimal(item.netAmount).toFixed(2), colX[5], y);
        doc.y = y + 14;
      }

      doc.moveDown(0.5);
      doc.fillColor('#888').fontSize(7).font('Helvetica-Oblique');
      doc.text(settlement.taxDisclaimer || SETTLEMENT_TAX_DISCLAIMER, 50, doc.y, {
        width: doc.page.width - 100,
      });
      doc.fillColor('#333').fontSize(10).font('Helvetica');

      doc.moveDown(1);
      ensureSpace(doc, 120);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a2744').text('Summary', 50);
      doc.font('Helvetica').fontSize(10).fillColor('#333');

      const lines: [string, number][] = [
        ['Paid Online Total', parseDecimal(settlement.paidOnlineTotal)],
        ['Pay At Hotel Total', parseDecimal(settlement.payAtHotelTotal)],
        ['Commission Total', parseDecimal(settlement.commissionTotal)],
        [`${taxLabel || 'Tax'} (informational)`, parseDecimal(settlement.taxTotal)],
        ['Credits', parseDecimal(settlement.creditsTotal)],
        ['Debits', parseDecimal(settlement.debitsTotal)],
        ['Refunds', parseDecimal(settlement.refundsTotal)],
        ['Opening Balance', parseDecimal(settlement.openingBalance)],
        ['Net Settlement', parseDecimal(settlement.netSettlement)],
        ['Closing Balance', parseDecimal(settlement.closingBalance)],
      ];

      for (const [label, val] of lines) {
        doc.text(`${label}: ${val.toFixed(2)} USD`, 50);
      }

      if (settlement.transactionRef) {
        doc.moveDown(0.3).text(`Transaction Reference: ${settlement.transactionRef}`);
      }

      drawBrandedFooter(doc);
    });
  }

  async writeReceiptPdf(settlement: SettlementDoc, outputPath: string) {
    await this.renderPdf(outputPath, (doc) => {
      drawBrandedHeader(
        doc,
        'Settlement Receipt',
        `${settlement.statementNumber} · ${settlement.hotel.name}`
      );

      const centerX = 50;
      const width = doc.page.width - 100;

      doc.moveDown(2);
      doc.fillColor('#1a2744').fontSize(28).font('Helvetica-Bold');
      doc.text(`${parseDecimal(settlement.netSettlement).toFixed(2)} USD`, centerX, doc.y, {
        width,
        align: 'center',
      });

      doc.moveDown(1);
      doc.fillColor('#22863a').fontSize(14).font('Helvetica-Bold');
      doc.text(`STATUS: ${settlement.status}`, centerX, doc.y, { width, align: 'center' });

      doc.moveDown(1.5);
      doc.fillColor('#333').fontSize(11).font('Helvetica');
      const details = [
        `Settlement Date: ${settlement.settlementDate.toISOString().slice(0, 10)}`,
        `Bookings: ${settlement.bookingCount}`,
        `Commission: ${parseDecimal(settlement.commissionTotal).toFixed(2)} USD`,
        settlement.taxLabel
          ? `${settlement.taxLabel} (informational): ${parseDecimal(settlement.taxTotal).toFixed(2)} USD`
          : `Tax (informational): ${parseDecimal(settlement.taxTotal).toFixed(2)} USD`,
        settlement.transactionRef ? `Reference: ${settlement.transactionRef}` : '',
      ].filter(Boolean);

      details.forEach((d) => doc.text(d, centerX, doc.y, { width, align: 'center' }));

      doc.moveDown(2);
      doc.fillColor('#c45c4a').fontSize(12).font('Helvetica-Bold');
      doc.text('PAID · COMPLETED · SUCCESS', centerX, doc.y, { width, align: 'center' });

      drawBrandedFooter(doc);
    });
  }

  private renderPdf(outputPath: string, render: (doc: InstanceType<typeof PDFDocument>) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      render(doc);
      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }
}

export const settlementPdfService = new SettlementPdfService();
