'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { getBookingVoucher, downloadBookingVoucherPdf, downloadBookingVoucherQr } from '@/lib/api';
import { useCurrency } from '@/lib/currency';

type Voucher = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  guestName: string;
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelCountry: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: string;
  currency: string;
  paymentMethod?: string | null;
  confirmationUrl: string;
};

export function BookingConfirmationCard({ bookingId }: { bookingId: string }) {
  const { format } = useCurrency();
  const searchParams = useSearchParams();
  const autoDownloaded = useRef(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [qrPayload, setQrPayload] = useState('');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    getBookingVoucher(bookingId).then((res) => {
      if (res.success && res.data) {
        const v = res.data as Voucher;
        setVoucher(v);
        setQrPayload(
          JSON.stringify({
            v: 1,
            ref: v.bookingNumber,
            id: v.bookingId,
            hotel: v.hotelName,
            in: v.checkIn,
            out: v.checkOut,
          })
        );
      } else {
        setError(res.error?.message || 'Could not load confirmation');
      }
    });
  }, [bookingId]);

  useEffect(() => {
    if (searchParams.get('download') !== 'pdf' || !voucher || autoDownloaded.current) return;
    autoDownloaded.current = true;
    downloadBookingVoucherPdf(bookingId, `estays-${voucher.bookingNumber}.pdf`).catch(() => {
      setError('Could not download PDF. Use the button below.');
    });
  }, [searchParams, voucher, bookingId]);

  const downloadPdf = async () => {
    if (!voucher) return;
    try {
      await downloadBookingVoucherPdf(bookingId, `estays-${voucher.bookingNumber}.pdf`);
    } catch {
      setError('Could not download PDF. Try again from My bookings.');
    }
  };

  const downloadQr = async () => {
    if (!voucher) return;
    try {
      await downloadBookingVoucherQr(bookingId, `estays-${voucher.bookingNumber}-qr.png`);
    } catch {
      setError('Could not download QR image.');
    }
  };

  const shareVoucher = async () => {
    if (!voucher || !navigator.share) return;
    setSharing(true);
    try {
      await navigator.share({
        title: `E Stays — ${voucher.bookingNumber}`,
        text: `Booking confirmed at ${voucher.hotelName}. Check-in ${voucher.checkIn}.`,
        url: voucher.confirmationUrl,
      });
    } catch {
      /* user cancelled */
    }
    setSharing(false);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link href="/bookings" className="text-brand text-sm mt-4 inline-block">← My bookings</Link>
      </div>
    );
  }

  if (!voucher) {
    return <div className="text-center py-20 text-ink-muted">Loading your confirmation…</div>;
  }

  const totalDisplay = format(Number(voucher.totalAmount));

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 text-2xl mb-3">✓</div>
        <h1 className="font-display text-2xl font-semibold text-ink">Booking confirmed!</h1>
        <p className="text-sm text-ink-muted mt-1">Confirmation sent from bookings@estayshotels.com</p>
      </div>

      <article className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        <div className="bg-navy text-white px-6 py-5">
          <p className="text-xs text-gold uppercase tracking-wide">E Stays voucher</p>
          <h2 className="font-semibold text-lg mt-1">{voucher.hotelName}</h2>
          <p className="text-sm text-white/70 mt-1">{voucher.hotelAddress}, {voucher.hotelCity}</p>
          <p className="text-xs text-gold mt-3 font-mono">Ref: {voucher.bookingNumber}</p>
        </div>

        <div className="p-6 grid grid-cols-[1fr_auto] gap-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted text-xs">Guest</dt>
              <dd className="font-medium text-ink">{voucher.guestName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Room</dt>
              <dd className="font-medium text-ink">{voucher.roomTypeName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Check-in</dt>
              <dd className="font-medium text-ink">{voucher.checkIn}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Check-out</dt>
              <dd className="font-medium text-ink">{voucher.checkOut}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Total</dt>
              <dd className="font-semibold text-ink text-lg">{totalDisplay}</dd>
            </div>
          </dl>

          {qrPayload && (
            <div className="text-center">
              <div className="p-3 bg-white border border-surface-border rounded-xl inline-block">
                <QRCodeSVG value={qrPayload} size={140} level="M" />
              </div>
              <p className="text-[10px] text-ink-muted mt-2 max-w-[140px]">Scan at check-in</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button type="button" onClick={downloadPdf} className="w-full py-3 btn-primary text-sm font-semibold">
            Download PDF voucher
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={downloadQr} className="py-2.5 btn-secondary text-sm">
              Save QR image
            </button>
            {'share' in navigator && (
              <button type="button" onClick={shareVoucher} disabled={sharing} className="py-2.5 btn-secondary text-sm">
                Share
              </button>
            )}
          </div>
          <p className="text-[11px] text-ink-muted text-center pt-2">
            Save the PDF or QR to your phone — works with Apple Wallet &amp; Google Wallet when you add the PDF/QR from your files app.
          </p>
        </div>
      </article>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/bookings" className="text-center py-2.5 px-4 btn-secondary text-sm">My bookings</Link>
        <Link href="/" className="text-center py-2.5 px-4 text-sm text-brand font-medium">Book another stay</Link>
      </div>
    </div>
  );
}
