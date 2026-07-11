import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Trademark Policy — E Stays Hotels' };

export default function TrademarkPage() {
  return (
    <LegalPage
      title="Trademark Policy"
      subtitle="Use of E Stays trademarks and brand assets."
      sections={[
        {
          title: 'Our Trademarks',
          content: (
            <>
              <p>The following are trademarks or registered trademarks of {COMPANY.name} or its affiliates:</p>
              <LegalList items={[
                'E Stays™',
                'E Stays Hotels™',
                'E Cover™',
                'The E Stays logo and house icon',
                'Stay. Live. Belong™',
              ]} />
            </>
          ),
        },
        {
          title: 'Permitted Use',
          content: (
            <LegalList items={[
              'Partner hotels may use approved E Stays branding materials provided through the Partner Portal.',
              'Press and media may use trademarks when reporting on E Stays with accurate attribution.',
              'Referencing E Stays in truthful, non-misleading editorial content.',
            ]} />
          ),
        },
        {
          title: 'Prohibited Use',
          content: (
            <LegalList items={[
              'Using E Stays trademarks in a way that implies endorsement without authorisation.',
              'Modifying, distorting, or combining trademarks with other marks.',
              'Using trademarks in domain names, social media handles, or business names without permission.',
              'Registering trademarks or confusingly similar marks in any jurisdiction.',
            ]} />
          ),
        },
        {
          title: 'Enforcement',
          content: (
            <p>
              Unauthorised use of E Stays trademarks may result in legal action. To request permission for trademark
              use, contact <a href={`mailto:${COMPANY.emails.general}`} className="text-coral hover:underline">{COMPANY.emails.general}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
