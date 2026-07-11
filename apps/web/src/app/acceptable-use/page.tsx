import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Acceptable Use Policy — E Stays Hotels' };

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      subtitle="Rules governing acceptable behaviour on the E Stays platform."
      sections={[
        {
          title: 'Purpose',
          content: <p>This policy defines acceptable and prohibited uses of the E Stays platform to ensure a safe, respectful experience for all users.</p>,
        },
        {
          title: 'Permitted Use',
          content: (
            <LegalList items={[
              'Searching for and booking hotel accommodation in good faith.',
              'Managing property listings and bookings through the Partner Portal.',
              'Leaving honest, constructive reviews of your stay.',
              'Contacting E Stays support for legitimate assistance.',
            ]} />
          ),
        },
        {
          title: 'Prohibited Conduct',
          content: (
            <LegalList items={[
              'Creating fake accounts or impersonating another person or entity.',
              'Making fraudulent bookings or payment transactions.',
              'Scraping, crawling, or automated data extraction from the Platform.',
              'Attempting to gain unauthorised access to systems, accounts, or data.',
              'Posting offensive, discriminatory, threatening, or illegal content.',
              'Circumventing platform fees by directing users to book off-platform.',
              'Manipulating search rankings, reviews, or pricing through artificial means.',
              'Using the Platform for any unlawful purpose.',
            ]} />
          ),
        },
        {
          title: 'Enforcement',
          content: (
            <p>
              Violations may result in content removal, account suspension, permanent termination, and referral to law
              enforcement where appropriate. {COMPANY.name} reserves the right to investigate and take action at its sole discretion.
            </p>
          ),
        },
      ]}
    />
  );
}
