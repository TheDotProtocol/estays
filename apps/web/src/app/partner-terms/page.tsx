import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Partner Terms — E Stays Hotels' };

export default function PartnerTermsPage() {
  return (
    <LegalPage
      title="Partner Terms"
      subtitle="Terms and conditions for hotels and property partners on the E Stays platform."
      sections={[
        {
          title: 'Agreement',
          content: (
            <p>
              By listing your property on the E Stays platform operated by {COMPANY.name}, you agree to these Partner
              Terms in addition to our general Terms & Conditions. These terms govern the relationship between E Stays
              and hotel partners.
            </p>
          ),
        },
        {
          title: 'Property Standards',
          content: (
            <LegalList items={[
              'Properties must meet minimum safety, cleanliness, and hospitality standards.',
              'All listings must accurately represent the property, amenities, and services offered.',
              'Properties must hold all required licences, permits, and insurance.',
              'E Stays reserves the right to inspect or audit listings and may remove properties that fail to meet standards.',
            ]} />
          ),
        },
        {
          title: 'Accurate Inventory & Pricing',
          content: (
            <LegalList items={[
              'Partners must maintain real-time room availability through the Partner Portal or connected channel manager.',
              'Pricing displayed on E Stays must match or be better than rates offered on other public channels (rate parity).',
              'All taxes, fees, and surcharges must be clearly disclosed.',
              'Partners are responsible for promptly updating inventory when rooms are unavailable.',
            ]} />
          ),
        },
        {
          title: 'Service Obligations',
          content: (
            <LegalList items={[
              'Honour all confirmed bookings at the agreed rate and room type.',
              'Provide check-in and check-out services as described in the listing.',
              'Respond to guest enquiries and issues in a timely and professional manner.',
              'Maintain the property in the condition represented in listing photographs.',
            ]} />
          ),
        },
        {
          title: 'Payouts',
          content: (
            <p>
              Payout schedules are defined in your partner agreement. Where same-day payout is contractually applicable,
              funds will be transferred to your designated bank account within the agreed timeframe after guest check-in.
              Contact {COMPANY.emails.billing} for payout enquiries.
            </p>
          ),
        },
        {
          title: 'Commission Structure',
          content: (
            <p>
              E Stays charges a commission on confirmed bookings as specified in your partner agreement. Commission rates
              may vary based on property type, volume, and promotional participation. All commission rates will be
              disclosed before you list your property.
            </p>
          ),
        },
        {
          title: 'Photo Requirements',
          content: (
            <LegalList items={[
              'Photographs must be current, high-quality, and accurately represent the property.',
              'You must own or have licence to use all uploaded images.',
              'Misleading, stock, or AI-generated photographs that do not represent the actual property are prohibited.',
              'E Stays may remove or replace photographs that do not meet quality standards.',
            ]} />
          ),
        },
        {
          title: 'Review Management',
          content: (
            <p>
              Guest reviews are an important part of the E Stays community. Partners may not offer incentives for
              positive reviews, post fake reviews, or retaliate against guests who leave honest feedback. E Stays
              reserves the right to remove reviews that violate our Community Guidelines.
            </p>
          ),
        },
        {
          title: 'Compliance',
          content: (
            <p>
              Partners must comply with all applicable local, state, national, and international laws governing
              hospitality, employment, taxation, data protection, accessibility, and consumer protection. {COMPANY.name}
              may suspend or terminate partnerships that fail to meet legal or platform requirements.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              Hotel Partnerships: <a href={`mailto:${COMPANY.emails.partner}`} className="text-coral hover:underline">{COMPANY.emails.partner}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
