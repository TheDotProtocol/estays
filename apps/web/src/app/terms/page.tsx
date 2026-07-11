import Link from 'next/link';
import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Terms & Conditions — E Stays Hotels' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="Please read these terms carefully before using the E Stays platform."
      sections={[
        {
          title: '1. Agreement to Terms',
          content: (
            <p>
              By accessing or using the E Stays platform operated by {COMPANY.name}, you agree to be bound by these
              Terms & Conditions. If you do not agree, you may not use the Platform.
            </p>
          ),
        },
        {
          title: '2. Eligibility',
          content: (
            <p>
              You must be at least 18 years of age and capable of forming a binding contract to use the Platform.
              By creating an account, you represent that all information you provide is accurate and current.
            </p>
          ),
        },
        {
          title: '3. User Accounts',
          content: (
            <LegalList items={[
              'You are responsible for maintaining the confidentiality of your account credentials.',
              'You are responsible for all activity that occurs under your account.',
              'You must notify us immediately of any unauthorised use of your account.',
              'We reserve the right to suspend or terminate accounts that violate these Terms.',
            ]} />
          ),
        },
        {
          title: '4. Booking Rules',
          content: (
            <LegalList items={[
              'All bookings are subject to availability and confirmation.',
              'You must provide accurate guest information at the time of booking.',
              'Bookings are made directly with partner hotels through the E Stays platform.',
              'Confirmation details will be sent to your registered email address.',
              'Special requests are subject to hotel availability and are not guaranteed.',
            ]} />
          ),
        },
        {
          title: '5. Hotel Responsibilities',
          content: (
            <LegalList items={[
              'Provide accurate property descriptions, amenities, and photographs.',
              'Maintain accurate room inventory and pricing.',
              'Honour confirmed bookings at the agreed rate and terms.',
              'Comply with all applicable local laws, licensing, and safety requirements.',
              'Handle guest check-in, check-out, and on-property services.',
            ]} />
          ),
        },
        {
          title: '6. Guest Responsibilities',
          content: (
            <LegalList items={[
              'Provide valid identification upon check-in as required by the hotel.',
              'Treat hotel property and staff with respect.',
              'Comply with hotel house rules and local laws.',
              'Pay all applicable charges, including incidentals not covered by the booking.',
              'Report any issues promptly to hotel staff and E Stays support.',
            ]} />
          ),
        },
        {
          title: '7. Pricing & Taxes',
          content: (
            <p>
              Prices displayed on the Platform include the room rate as set by partner hotels. Additional taxes, resort
              fees, tourism levies, and other charges may apply and will be disclosed during the booking process or
              collected by the hotel at check-in. Currency conversion rates may apply for international bookings.
            </p>
          ),
        },
        {
          title: '8. Payments',
          content: (
            <p>
              Payments are processed through secure third-party payment providers. By providing payment information,
              you authorise us to charge the total booking amount. You agree to provide current, complete, and accurate
              payment information. See our <Link href="/refund-policy" className="text-coral hover:underline">Refund Policy</Link> for
              cancellation and refund terms.
            </p>
          ),
        },
        {
          title: '9. Cancellations & Refunds',
          content: (
            <p>
              Cancellation and refund eligibility depends on the rate plan selected at the time of booking. Refundable
              and non-refundable rates are clearly indicated during checkout. Please review our{' '}
              <Link href="/refund-policy" className="text-coral hover:underline">Refund & Cancellation Policy</Link> for full details.
            </p>
          ),
        },
        {
          title: '10. Chargebacks',
          content: (
            <p>
              If you initiate a chargeback without first contacting E Stays support to resolve the issue, we reserve
              the right to dispute the chargeback and may suspend your account pending investigation. Fraudulent
              chargebacks may result in permanent account termination and referral to appropriate authorities.
            </p>
          ),
        },
        {
          title: '11. Intellectual Property',
          content: (
            <p>
              All content on the Platform — including logos, text, graphics, software, and design — is owned by or
              licensed to {COMPANY.name} and protected by intellectual property laws. You may not reproduce,
              distribute, or create derivative works without our prior written consent.
            </p>
          ),
        },
        {
          title: '12. User-Generated Content',
          content: (
            <p>
              Reviews, ratings, photographs, and other content you submit may be used by E Stays on the Platform and
              in marketing materials. You grant us a non-exclusive, royalty-free licence to use, display, and
              distribute such content. You represent that your content does not violate any third-party rights.
            </p>
          ),
        },
        {
          title: '13. Limitation of Liability',
          content: (
            <p>
              To the maximum extent permitted by law, {COMPANY.name} shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the Platform. Our total liability
              for any claim shall not exceed the amount you paid to E Stays for the booking giving rise to the claim.
              E Stays acts as an intermediary between guests and partner hotels and is not the provider of accommodation services.
            </p>
          ),
        },
        {
          title: '14. Indemnification',
          content: (
            <p>
              You agree to indemnify and hold harmless {COMPANY.name}, its parent companies, officers, directors,
              employees, and agents from any claims, damages, losses, or expenses arising from your violation of these
              Terms or your use of the Platform.
            </p>
          ),
        },
        {
          title: '15. Termination',
          content: (
            <p>
              We may suspend or terminate your access to the Platform at any time, with or without cause, and with or
              without notice. Upon termination, provisions that by their nature should survive will remain in effect.
            </p>
          ),
        },
        {
          title: '16. Governing Law',
          content: (
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the {COMPANY.governingLaw},
              without regard to conflict of law principles. Any disputes shall be subject to the exclusive jurisdiction
              of the courts located in Santa Clara County, California.
            </p>
          ),
        },
        {
          title: '17. Contact',
          content: (
            <p>
              {COMPANY.name}<br />
              {COMPANY.address.line1}, {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}<br />
              Email: <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">{COMPANY.emails.support}</a><br />
              Phone: {COMPANY.phone}
            </p>
          ),
        },
      ]}
    />
  );
}
