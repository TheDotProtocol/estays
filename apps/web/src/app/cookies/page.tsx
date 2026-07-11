import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Cookie Policy — E Stays Hotels' };

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="How E Stays uses cookies and similar technologies."
      sections={[
        {
          title: 'What Are Cookies?',
          content: (
            <p>
              Cookies are small text files placed on your device when you visit our website. They help us provide,
              protect, and improve the E Stays platform by remembering your preferences and understanding how you
              interact with our services.
            </p>
          ),
        },
        {
          title: 'Types of Cookies We Use',
          content: (
            <>
              <p><strong className="text-navy">Essential Cookies</strong> — Required for the Platform to function. These enable core features such as account authentication, booking processing, and security. These cannot be disabled.</p>
              <p><strong className="text-navy">Analytics Cookies</strong> — Help us understand how visitors use the Platform, which pages are most popular, and how users navigate between sections. This data is aggregated and anonymised where possible.</p>
              <p><strong className="text-navy">Preference Cookies</strong> — Remember your settings such as language, currency (INR), and display preferences to provide a personalised experience.</p>
              <p><strong className="text-navy">Marketing Cookies</strong> — Used only where you have provided consent. These may be used to deliver relevant advertisements and measure campaign effectiveness on third-party platforms.</p>
            </>
          ),
        },
        {
          title: 'Third-Party Cookies',
          content: (
            <p>
              Some cookies are placed by third-party services we use, such as payment processors, analytics providers,
              and embedded content. These third parties have their own privacy policies governing their use of cookies.
            </p>
          ),
        },
        {
          title: 'Managing Cookie Preferences',
          content: (
            <LegalList items={[
              'Use your browser settings to block or delete cookies. Note that blocking essential cookies may affect Platform functionality.',
              'Use the cookie preference centre (when available) to opt in or out of non-essential cookies.',
              'Opt out of marketing cookies through the unsubscribe link in marketing emails.',
              'For mobile app users, manage permissions through your device settings.',
            ]} />
          ),
        },
        {
          title: 'Updates',
          content: (
            <p>
              We may update this Cookie Policy to reflect changes in technology or regulation. Continued use of the
              Platform after updates constitutes acceptance of the revised policy.
            </p>
          ),
        },
      ]}
    />
  );
}
