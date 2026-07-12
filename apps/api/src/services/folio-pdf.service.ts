import PDFDocument from 'pdfkit';
import { ESTAYS_COMPANY } from '@estays/shared';
import { parseDecimal } from '../utils/helpers';

type FolioDoc = {
  bookingNumber: string;
  hotelName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  subtotal: unknown;
  taxAmount: unknown;
  total: unknown;
  items: { type: string; description: string; quantity: number; unitPrice: unknown; totalPrice: unknown }[];
};

export function generateFolioPdf(doc: FolioDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fillColor('#1a2b4a').fontSize(18).font('Helvetica-Bold').text('E Stays Hotels', 50, 50);
    pdf.fontSize(10).font('Helvetica').fillColor('#666').text(ESTAYS_COMPANY.tagline, 50, 72);
    pdf.fontSize(14).fillColor('#1a2b4a').font('Helvetica-Bold').text('Guest Folio / Receipt', 50, 100);

    pdf.fontSize(10).font('Helvetica').fillColor('#333');
    pdf.text(`Hotel: ${doc.hotelName}`, 50, 130);
    pdf.text(`Guest: ${doc.guestName}`, 50, 145);
    pdf.text(`Booking: ${doc.bookingNumber}`, 50, 160);
    pdf.text(`Stay: ${doc.checkIn} → ${doc.checkOut}`, 50, 175);
    pdf.text(`Status: ${doc.status}`, 50, 190);

    let y = 220;
    pdf.font('Helvetica-Bold').text('Description', 50, y);
    pdf.text('Qty', 320, y);
    pdf.text('Amount', 420, y);
    y += 18;
    pdf.moveTo(50, y).lineTo(550, y).stroke('#ddd');
    y += 10;

    pdf.font('Helvetica');
    for (const item of doc.items) {
      pdf.text(item.description, 50, y, { width: 250 });
      pdf.text(String(item.quantity), 320, y);
      pdf.text(parseDecimal(item.totalPrice).toFixed(2), 420, y);
      y += 18;
    }

    y += 10;
    pdf.moveTo(50, y).lineTo(550, y).stroke('#ddd');
    y += 15;
    pdf.text(`Subtotal: ${parseDecimal(doc.subtotal).toFixed(2)}`, 350, y);
    y += 15;
    pdf.text(`Tax: ${parseDecimal(doc.taxAmount).toFixed(2)}`, 350, y);
    y += 15;
    pdf.font('Helvetica-Bold').text(`Total: ${parseDecimal(doc.total).toFixed(2)}`, 350, y);

    pdf.fontSize(8).fillColor('#999').font('Helvetica')
      .text(ESTAYS_COMPANY.name, 50, 750, { align: 'center', width: 500 });

    pdf.end();
  });
}
