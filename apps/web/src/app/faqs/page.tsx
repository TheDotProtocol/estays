import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'FAQs — E Stays Hotels' };

const faqs = [
  { q: 'How do I book a hotel on E Stays?', a: 'Search for your destination and dates on the homepage, select a hotel, choose your room type, and complete the booking with payment. You\'ll receive a confirmation email with your booking reference.' },
  { q: 'Can I cancel my booking?', a: 'Yes, if your rate plan allows cancellation. Check your booking details under My Bookings for the cancellation deadline. See our Refund Policy for full terms.' },
  { q: 'What payment methods are accepted?', a: 'Pay at Hotel (no online payment), UPI for India (GPay, PhonePe, Paytm), Alipay for Thailand, and Thai QR / PromptPay. Scan the QR code at checkout to pay instantly.' },
  { q: 'How do I list my hotel on E Stays?', a: 'Sign in to the Partner Portal and click "+ Add Hotel" to submit your property for admin approval. Once approved, you can upload photos, set pricing, and manage inventory.' },
  { q: 'Is my payment information secure?', a: 'Yes. Online payments use secure QR-based systems (UPI, Alipay, PromptPay). E Stays does not store payment credentials on our servers.' },
  { q: 'How do I contact customer support?', a: `Email ${COMPANY.emails.support} or call ${COMPANY.phone}. Our team typically responds within 24 hours.` },
  { q: 'What currency are prices shown in?', a: 'Use the currency selector in the header to view prices in INR, THB, USD, EUR, GBP, and more. Your chosen currency applies across search, booking, and checkout.' },
];

export default function FaqsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy mb-2">Frequently Asked Questions</h1>
      <p className="text-navy/60 mb-10">Quick answers to common questions about E Stays.</p>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <details key={faq.q} className="bg-white rounded-xl border border-gold/10 group">
            <summary className="px-6 py-4 cursor-pointer font-medium text-navy hover:text-coral transition list-none flex justify-between items-center">
              {faq.q}
              <span className="text-navy/30 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-sm text-navy/70 leading-relaxed">{faq.a}</div>
          </details>
        ))}
      </div>

      <p className="text-center text-sm text-navy/50 mt-8">
        Still have questions? <Link href="/contact" className="text-coral hover:underline">Contact us</Link>
      </p>
    </div>
  );
}
