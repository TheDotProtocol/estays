import { LegalPage, LegalList } from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Copyright Policy — E Stays Hotels' };

export default function CopyrightPage() {
  return (
    <LegalPage
      title="Copyright Policy"
      subtitle="Intellectual property rights and DMCA takedown procedures."
      sections={[
        {
          title: 'Ownership',
          content: (
            <p>
              All content on the E Stays platform — including text, graphics, logos, photographs, software, and design
              elements — is the property of {COMPANY.name} or its licensors and is protected by United States and
              international copyright laws.
            </p>
          ),
        },
        {
          title: 'User Content',
          content: (
            <p>
              By uploading content (photographs, reviews, descriptions) to the Platform, you grant E Stays a
              non-exclusive, worldwide, royalty-free licence to use, reproduce, and display that content in
              connection with operating and promoting the Platform. You retain ownership of your original content.
            </p>
          ),
        },
        {
          title: 'DMCA Takedown Notice',
          content: (
            <>
              <p>If you believe content on the Platform infringes your copyright, send a written notice to:</p>
              <p className="mt-2">
                {COMPANY.name} — Copyright Agent<br />
                {COMPANY.address.line1}<br />
                {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}<br />
                Email: <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">{COMPANY.emails.support}</a>
              </p>
              <p className="mt-4">Your notice must include:</p>
              <LegalList items={[
                'Identification of the copyrighted work claimed to be infringed.',
                'Identification of the infringing material and its location on the Platform.',
                'Your contact information (name, address, phone, email).',
                'A statement of good faith belief that use is not authorised.',
                'A statement, under penalty of perjury, that the information is accurate and you are authorised to act.',
                'Your physical or electronic signature.',
              ]} />
            </>
          ),
        },
        {
          title: 'Repeat Infringers',
          content: (
            <p>We will terminate accounts of users who are repeat copyright infringers in appropriate circumstances.</p>
          ),
        },
      ]}
    />
  );
}
