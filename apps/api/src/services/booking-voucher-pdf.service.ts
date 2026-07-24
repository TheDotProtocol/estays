import PDFDocument from 'pdfkit';
import { ESTAYS_COMPANY } from '@estays/shared';
import { BookingVoucherData, generateVoucherQrPng } from './booking-voucher.service';

export async function generateBookingVoucherPdf(data: BookingVoucherData): Promise<Buffer> {
  const qrPng = await generateVoucherQrPng(data);

  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const coral = '#E0394E';
    const navy = '#1a2b4a';
    const muted = '#64748b';

    pdf.rect(0, 0, pdf.page.width, 120).fill(navy);
    pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('E Stays Hotels', 40, 36);
    pdf.fontSize(11).font('Helvetica').fillColor('#fbbf24').text('Booking confirmation voucher', 40, 64);
    pdf.fontSize(10).fillColor('#ffffff').text(`Ref: ${data.bookingNumber}`, 40, 86);

    pdf.fillColor(navy).font('Helvetica-Bold').fontSize(16).text(data.hotelName, 40, 140);
    pdf.font('Helvetica').fontSize(10).fillColor(muted)
      .text(`${data.hotelAddress}, ${data.hotelCity}, ${data.hotelCountry}`, 40, 162, { width: 320 });

    let y = 200;
    const row = (label: string, value: string) => {
      pdf.font('Helvetica').fontSize(9).fillColor(muted).text(label, 40, y);
      pdf.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(value, 180, y - 1);
      y += 24;
    };

    row('Guest', data.guestName);
    row('Room', data.roomTypeName);
    row('Check-in', data.checkIn);
    row('Check-out', data.checkOut);
    row('Nights', String(data.nights));
    row('Guests', `${data.adults} adult${data.adults > 1 ? 's' : ''}${data.children ? `, ${data.children} child` : ''}`);
    row('Total', `${data.currency} ${data.totalAmount}`);
    if (data.paymentMethod) row('Payment', data.paymentMethod.replace(/_/g, ' '));

    pdf.roundedRect(360, 190, 190, 190, 8).lineWidth(1).stroke('#e2e8f0');
    pdf.image(qrPng, 385, 210, { width: 140, height: 140 });
    pdf.fontSize(8).fillColor(muted).text('Scan at check-in', 360, 388, { width: 190, align: 'center' });

    pdf.moveTo(40, 360).lineTo(pdf.page.width - 40, 360).stroke('#e2e8f0');
    pdf.fontSize(9).fillColor(navy).font('Helvetica-Bold').text('Important information', 40, 378);
    pdf.font('Helvetica').fontSize(9).fillColor(muted).text(
      'Present this voucher or QR code at the property reception. Photo ID may be required. ' +
        'For changes or cancellations, visit your E Stays account or contact bookings@estayshotels.com.',
      40,
      396,
      { width: 300, lineGap: 3 }
    );

    pdf.fontSize(8).fillColor(muted).font('Helvetica')
      .text(
        `${ESTAYS_COMPANY.name} · ${ESTAYS_COMPANY.tagline} · ${data.confirmationUrl}`,
        40,
        760,
        { align: 'center', width: pdf.page.width - 80 }
      );

    pdf.end();
  });
}
