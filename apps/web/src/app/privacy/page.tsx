import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Privacy Policy — E Stays Hotels' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle={`How ${COMPANY.name} collects, uses, and protects your personal information.`}
      sections={[
        {
          title: 'Introduction',
          content: (
            <p>
              {COMPANY.name} (&quot;E Stays,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the E Stays Hotels
              platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our website, mobile applications, and related services (collectively, the &quot;Platform&quot;).
            </p>
          ),
        },
        {
          title: 'Information We Collect',
          content: (
            <>
              <p>We may collect the following categories of personal information:</p>
              <LegalList items={[
                'Name',
                'Email address',
                'Phone number',
                'Date of birth (where applicable)',
                'Government-issued identification for hotel check-in or verification purposes',
                'Payment information (processed securely through third-party payment providers; we do not store full card numbers)',
                'Booking history and reservation details',
                'Search history and preferences on the Platform',
                'Device information, IP address, and browser information',
                'Cookies and similar tracking technologies',
                'Location data (only when you grant explicit permission)',
              ]} />
            </>
          ),
        },
        {
          title: 'How We Use Information',
          content: (
            <LegalList items={[
              'Process and manage hotel bookings and reservations',
              'Provide customer support and respond to enquiries',
              'Detect, prevent, and address fraud and security incidents',
              'Improve search results, recommendations, and platform performance',
              'Send marketing communications where you have provided consent',
              'Verify hotel partners and guest identities where required',
              'Process payments and manage billing',
              'Comply with applicable legal and regulatory obligations',
            ]} />
          ),
        },
        {
          title: 'Information Sharing',
          content: (
            <>
              <p>E Stays may share your information with the following categories of recipients, solely as necessary to operate the Platform:</p>
              <LegalList items={[
                'Partner hotels to fulfil your bookings and provide accommodation services',
                'Payment processors to securely handle transactions',
                'Government authorities, law enforcement, or regulators where legally required',
                'Service providers who assist in operating the Platform (hosting, analytics, customer support, email delivery)',
              ]} />
              <p className="font-medium text-navy mt-4">
                We do not sell your personal data to third parties.
              </p>
            </>
          ),
        },
        {
          title: 'Security',
          content: (
            <>
              <p>We implement reasonable technical and organisational measures to protect your information, including:</p>
              <LegalList items={[
                'Encryption of data in transit using industry-standard protocols (TLS/HTTPS)',
                'Secure authentication mechanisms and access controls',
                'Role-based access to internal systems',
                'Regular monitoring for suspicious activity',
                'Industry-standard safeguards appropriate to the nature of the data we process',
              ]} />
              <p>No method of transmission over the Internet is completely secure. While we strive to protect your personal information, we cannot guarantee absolute security.</p>
            </>
          ),
        },
        {
          title: 'Your Rights',
          content: (
            <>
              <p>Depending on your location, you may have the following rights regarding your personal data:</p>
              <LegalList items={[
                'Access the personal data we hold about you',
                'Request correction of inaccurate or incomplete data',
                'Request deletion of your account and associated data',
                'Download a copy of your personal data in a portable format',
                'Opt out of marketing communications at any time',
                'Manage cookie preferences through your browser or our cookie settings',
              ]} />
              <p>To exercise these rights, contact us at {COMPANY.emails.support}.</p>
            </>
          ),
        },
        {
          title: 'Data Retention',
          content: (
            <p>
              We retain personal information for as long as necessary to fulfil the purposes described in this policy,
              including to satisfy legal, accounting, or reporting requirements. Booking records may be retained for
              a period required by applicable tax and hospitality regulations.
            </p>
          ),
        },
        {
          title: 'Children',
          content: (
            <p>
              The Platform is not directed to individuals under the age of 18. We do not knowingly collect personal
              information from children. If you believe we have collected information from a minor, please contact us
              immediately.
            </p>
          ),
        },
        {
          title: 'Changes to This Policy',
          content: (
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the
              updated policy on the Platform and updating the &quot;Last updated&quot; date. Your continued use of the Platform
              after changes constitutes acceptance of the revised policy.
            </p>
          ),
        },
      ]}
    />
  );
}
