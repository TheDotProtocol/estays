import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Community Guidelines — E Stays Hotels' };

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      title="Community Guidelines"
      subtitle="Standards for respectful interaction on the E Stays platform."
      sections={[
        {
          title: 'Our Community Values',
          content: (
            <p>
              E Stays is built on the belief that everyone deserves a welcoming place to stay. Our community includes
              guests, hotel partners, and team members united by respect, honesty, and hospitality.
            </p>
          ),
        },
        {
          title: 'Be Respectful',
          content: (
            <LegalList items={[
              'Treat hotel staff, fellow guests, and E Stays team members with courtesy.',
              'Communicate honestly and constructively in reviews and messages.',
              'Respect cultural differences and local customs at your destination.',
              'Do not engage in harassment, bullying, or discriminatory behaviour.',
            ]} />
          ),
        },
        {
          title: 'Be Honest',
          content: (
            <LegalList items={[
              'Provide accurate information in your profile and bookings.',
              'Write truthful reviews based on your actual experience.',
              'Report safety concerns and property issues promptly.',
              'Do not post fake reviews or manipulate ratings.',
            ]} />
          ),
        },
        {
          title: 'Be Safe',
          content: (
            <LegalList items={[
              'Follow hotel safety guidelines and emergency procedures.',
              'Report suspicious activity or safety hazards immediately.',
              'Do not use the Platform to arrange illegal activities.',
              'Keep your account credentials secure.',
            ]} />
          ),
        },
        {
          title: 'Anti-Discrimination',
          content: (
            <p>
              E Stays prohibits discrimination of any kind based on race, colour, ethnicity, national origin, religion,
              sexual orientation, gender identity, disability, or any other protected characteristic. Violations will
              result in account termination.
            </p>
          ),
        },
        {
          title: 'Reporting Violations',
          content: (
            <p>
              If you encounter behaviour that violates these guidelines, please report it to{' '}
              <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">{COMPANY.emails.support}</a>{' '}
              or through the Help Center.
            </p>
          ),
        },
      ]}
    />
  );
}
