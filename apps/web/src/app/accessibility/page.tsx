import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Accessibility Statement — E Stays Hotels' };

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      subtitle="Our commitment to making E Stays accessible to everyone."
      sections={[
        {
          title: 'Our Commitment',
          content: (
            <p>
              {COMPANY.name} is committed to ensuring digital accessibility for people with disabilities. We continually
              improve the user experience for everyone and apply relevant accessibility standards to the E Stays platform.
            </p>
          ),
        },
        {
          title: 'Accessibility Features',
          content: (
            <LegalList items={[
              'Keyboard navigation support across core platform functions.',
              'Alternative text for meaningful images where applicable.',
              'Sufficient colour contrast ratios in our design system.',
              'Responsive design for use across devices and screen sizes.',
              'Hotel accessibility filters to help guests find suitable accommodations.',
              'Screen reader compatibility for primary navigation and booking flows.',
            ]} />
          ),
        },
        {
          title: 'Hotel Accessibility',
          content: (
            <p>
              We encourage partner hotels to accurately list accessibility features (wheelchair access, accessible rooms,
              hearing-impaired services, etc.) in their property descriptions. Guests can filter search results by
              accessibility requirements.
            </p>
          ),
        },
        {
          title: 'Known Limitations',
          content: (
            <p>
              We are actively working to improve accessibility across all areas of the Platform. Some third-party
              content, embedded maps, or legacy pages may not yet meet all accessibility standards.
            </p>
          ),
        },
        {
          title: 'Feedback & Assistance',
          content: (
            <p>
              If you encounter accessibility barriers on the E Stays platform, please contact us at{' '}
              <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">{COMPANY.emails.support}</a>{' '}
              or call {COMPANY.phone}. We aim to respond to accessibility feedback within 5 business days.
            </p>
          ),
        },
        {
          title: 'Standards',
          content: (
            <p>
              We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Our ongoing efforts
              include regular accessibility audits and user testing.
            </p>
          ),
        },
      ]}
    />
  );
}
