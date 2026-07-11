import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Data Protection & GDPR Notice — E Stays Hotels' };

export default function GdprPage() {
  return (
    <LegalPage
      title="Data Protection & GDPR Notice"
      subtitle="Your data protection rights under GDPR and applicable privacy laws."
      sections={[
        {
          title: 'Data Controller',
          content: (
            <p>
              {COMPANY.name}<br />
              {COMPANY.address.line1}, {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}, {COMPANY.address.country}<br />
              Email: <a href={`mailto:${COMPANY.emails.general}`} className="text-coral hover:underline">{COMPANY.emails.general}</a>
            </p>
          ),
        },
        {
          title: 'Legal Basis for Processing',
          content: (
            <LegalList items={[
              'Contract performance — processing necessary to fulfil your bookings.',
              'Legitimate interests — fraud prevention, platform improvement, and security.',
              'Legal obligation — compliance with tax, hospitality, and regulatory requirements.',
              'Consent — marketing communications and non-essential cookies (where applicable).',
            ]} />
          ),
        },
        {
          title: 'Your Rights Under GDPR',
          content: (
            <p>If you are located in the European Economic Area (EEA), United Kingdom, or other jurisdictions with similar protections, you have the right to:</p>
          ),
        },
        {
          title: 'Rights',
          content: (
            <LegalList items={[
              'Access — request a copy of the personal data we hold about you.',
              'Rectification — request correction of inaccurate or incomplete data.',
              'Erasure — request deletion of your data ("right to be forgotten") where applicable.',
              'Restriction — request that we limit processing of your data in certain circumstances.',
              'Portability — receive your data in a structured, machine-readable format.',
              'Objection — object to processing based on legitimate interests or for direct marketing.',
              'Withdraw consent — where processing is based on consent, withdraw at any time.',
              'Lodge a complaint — with your local data protection supervisory authority.',
            ]} />
          ),
        },
        {
          title: 'International Transfers',
          content: (
            <p>
              Your data may be transferred to and processed in the United States and other countries where our service
              providers operate. We ensure appropriate safeguards are in place, including standard contractual clauses
              approved by the European Commission where required.
            </p>
          ),
        },
        {
          title: 'Data Retention',
          content: (
            <p>
              We retain personal data only as long as necessary for the purposes described in our Privacy Policy or as
              required by law. Booking and financial records may be retained for up to 7 years for tax and regulatory compliance.
            </p>
          ),
        },
        {
          title: 'Exercising Your Rights',
          content: (
            <p>
              To exercise any of these rights, email{' '}
              <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">{COMPANY.emails.support}</a>{' '}
              with the subject line &quot;Data Protection Request.&quot; We will respond within 30 days as required by applicable law.
            </p>
          ),
        },
      ]}
    />
  );
}
