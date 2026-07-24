'use client';

import { useParams } from 'next/navigation';
import { BookingConfirmationCard } from '@/components/BookingConfirmationCard';

export default function BookingConfirmationPage() {
  const params = useParams();
  const bookingId = params.id as string;
  return <BookingConfirmationCard bookingId={bookingId} />;
}
