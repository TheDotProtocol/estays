import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Refund & Cancellation Policy — E Stays Hotels' };

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      subtitle="Understanding cancellation options, refunds, and no-show policies."
      sections={[
        {
          title: 'Overview',
          content: (
            <p>
              Cancellation and refund eligibility depends on the rate plan and cancellation policy displayed at the time
              of booking. Please review these terms carefully before confirming your reservation.
            </p>
          ),
        },
        {
          title: 'Free Cancellation',
          content: (
            <>
              <p>Refundable rate plans allow free cancellation within the cancellation window specified during booking, typically:</p>
              <LegalList items={[
                'Cancellation at least 24 hours before the scheduled check-in time (unless otherwise stated)',
                'Full refund to the original payment method',
                'No cancellation fee applied within the eligible window',
              ]} />
              <p>The exact cancellation deadline is shown on your booking confirmation and in your account under My Bookings.</p>
            </>
          ),
        },
        {
          title: 'Non-Refundable Bookings',
          content: (
            <LegalList items={[
              'Non-refundable rate plans are clearly labelled during the booking process.',
              'No refund will be issued if you cancel a non-refundable booking for any reason.',
              'Non-refundable bookings may offer a reduced rate in exchange for restricted cancellation terms.',
              'Changes to dates or room types on non-refundable bookings are subject to hotel approval and may incur additional charges.',
            ]} />
          ),
        },
        {
          title: 'Hotel Cancellation Procedures',
          content: (
            <LegalList items={[
              'Guests may cancel eligible bookings through the E Stays platform under My Bookings.',
              'Cancellations can also be requested via email at ' + COMPANY.emails.support + '.',
              'Hotel-initiated cancellations (e.g., due to overbooking or force majeure) will result in a full refund or alternative accommodation at no additional cost.',
              'E Stays will notify affected guests promptly in the event of a hotel-initiated cancellation.',
            ]} />
          ),
        },
        {
          title: 'No-Show Policy',
          content: (
            <LegalList items={[
              'A no-show occurs when a guest fails to arrive on the check-in date without cancelling.',
              'No-show bookings are charged the full reservation amount.',
              'No refunds are issued for no-show bookings on non-refundable rates.',
              'For refundable rates, the no-show may be treated as a late cancellation and may forfeit the refund depending on the rate plan terms.',
            ]} />
          ),
        },
        {
          title: 'Refund Timelines',
          content: (
            <LegalList items={[
              'Approved refunds are initiated within 5–7 business days of cancellation approval.',
              'Refunds are returned to the original payment method used at booking.',
              'Bank processing times may add an additional 5–10 business days before funds appear in your account.',
              'For payment disputes, contact ' + COMPANY.emails.billing + ' with your booking reference number.',
            ]} />
          ),
        },
        {
          title: 'Payment Reversal Handling',
          content: (
            <p>
              If a refund cannot be processed to the original payment method (e.g., expired card), E Stays will contact
              you to arrange an alternative refund method. Chargebacks initiated without first contacting our support
              team may delay resolution. Please reach out to {COMPANY.emails.billing} before initiating a chargeback.
            </p>
          ),
        },
      ]}
    />
  );
}
