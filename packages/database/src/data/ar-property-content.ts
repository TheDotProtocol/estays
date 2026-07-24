import type { HotelRichContent } from '@estays/shared';

/** Agoda-style structured guides for AR Hospitality properties. */
export const AR_PROPERTY_CONTENT: Record<string, HotelRichContent> = {
  'sandcastle-mara-lodge': {
    tagline: 'Affordable safari lodge on the edge of the Maasai Mara',
    aboutSections: [
      {
        title: 'Wake up to the wild at E Stays Sandcastle Mara Lodge',
        body: 'E Stays Sandcastle Mara Lodge offers budget-friendly accommodation in Sekenani, on the doorstep of the Maasai Mara National Reserve. Wake to wildlife sounds, enjoy wooden verandahs and tented rooms, and use the lodge as your base for unforgettable game drives — without the luxury price tag.',
      },
      {
        title: 'Safari packages & group stays',
        body: 'Choose from single, double, triple, and family room packages — including 2- and 3-night safari camping options. E Stays Sandcastle Mara Lodge is ideal for solo travellers, couples, and small groups looking for authentic Mara experiences with clean, welcoming rooms.',
      },
    ],
    facilities: [
      {
        category: 'Safari & outdoors',
        items: ['Game drive arrangements', 'Camping packages', 'Garden & verandah seating', 'Wildlife viewing'],
      },
      {
        category: 'Dining',
        items: ['Restaurant', 'Breakfast available', 'Outdoor dining on verandah'],
      },
      {
        category: 'Services & conveniences',
        items: ['Free WiFi', 'Parking', '24-hour front desk', 'Luggage storage', 'Daily housekeeping'],
      },
    ],
    locationHighlights: [
      { name: 'Maasai Mara National Reserve', distance: 'On doorstep' },
      { name: 'Sekenani gate area', distance: 'Nearby' },
      { name: 'Narok town', distance: 'Scenic drive' },
    ],
    policies: [
      {
        title: 'Check-in / Check-out',
        items: ['Check-in from 2:00 PM', 'Check-out until 11:00 AM', 'Early check-in subject to availability'],
      },
      {
        title: 'Good to know',
        items: [
          'Safari packages may include multiple nights — see room details for length of stay',
          'Children welcome — contact property for family room options',
          'Book with E Stays for instant confirmation',
        ],
      },
    ],
    usefulFacts: [
      { label: 'Property type', value: 'Budget safari lodge' },
      { label: 'Location', value: 'Sekenani, Maasai Mara, Kenya' },
      { label: 'Languages', value: 'English, Swahili' },
      { label: 'Book via', value: 'E Stays' },
    ],
    amenityNames: ['Free WiFi', 'Restaurant', 'Parking', 'Breakfast Included', 'Safari Tours'],
  },

  'grand-sunset-phuket': {
    tagline: 'Boutique beach hotel on Phuket\'s sunset coast',
    aboutSections: [
      {
        title: 'Sunset views on the Andaman Sea',
        body: 'E Stays Grand Sunset Phuket is a boutique beach hotel steps from the Andaman Sea. Enjoy rooftop pool views, Thai-fusion dining, and comfortable rooms designed for couples and families exploring Phuket\'s west coast.',
      },
      {
        title: 'Relax after a day at the beach',
        body: 'Return from Karon or nearby beaches to a welcoming lobby, air-conditioned rooms, and friendly service. E Stays Grand Sunset Phuket balances value and comfort for travellers who want ocean proximity without mega-resort crowds.',
      },
    ],
    facilities: [
      {
        category: 'Wellness & recreation',
        items: ['Swimming pool', 'Rooftop pool', 'Beach access nearby', 'Garden'],
      },
      {
        category: 'Dining',
        items: ['Restaurant', 'Bar', 'Breakfast included', 'Room service'],
      },
      {
        category: 'Services',
        items: ['Free WiFi', 'Air conditioning', 'Daily housekeeping', 'Parking', 'Concierge'],
      },
    ],
    locationHighlights: [
      { name: 'Karon Beach', distance: 'Short drive' },
      { name: 'Phuket town', distance: 'Accessible by road' },
      { name: 'Phuket International Airport', distance: 'Approx. 45 km' },
    ],
    policies: [
      {
        title: 'Check-in / Check-out',
        items: ['Check-in from 2:00 PM', 'Check-out until 12:00 PM'],
      },
      {
        title: 'Property policies',
        items: ['Non-smoking rooms available', 'Free cancellation on flexible rates via E Stays', 'Valid ID required at check-in'],
      },
    ],
    usefulFacts: [
      { label: 'Star rating', value: '4 stars' },
      { label: 'City', value: 'Phuket, Thailand' },
      { label: 'Property type', value: 'Boutique hotel' },
    ],
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Restaurant', 'Bar', 'Ocean View', 'Breakfast Included', 'Air Conditioning'],
  },

  'keraton-jimbaran': {
    tagline: 'Balinese luxury in the heart of Jimbaran Bay',
    aboutSections: [
      {
        title: 'Experience luxury and tranquility at E Stays Keraton Jimbaran',
        body: 'Nestled in Bali, E Stays Keraton Jimbaran is a 4-star haven blending luxury, comfort, and tranquility. Stunning architecture and lush tropical gardens create an idyllic escape. Built in 1991 and renovated in 2009, the resort offers timeless charm with modern amenities across 102 beautifully appointed rooms and villas.',
      },
      {
        title: 'Rooms, villas & family-friendly stays',
        body: 'Choose spacious Deluxe Rooms or private Pool Villas with serene atmosphere and landscape views. Warm staff ensure an exceptional stay from the moment you arrive. Families are welcome — children aged 2–5 stay free when using existing bedding, making E Stays Keraton Jimbaran ideal for memorable Bali holidays.',
      },
      {
        title: 'Dining & Balinese hospitality',
        body: 'Indulge in Indonesian and international cuisine at the resort\'s restaurants, unwind by lagoon-style pools, or explore Jimbaran\'s famous seafood dining on the beach just minutes away.',
      },
    ],
    facilities: [
      {
        category: 'Wellness & recreation',
        items: ['Outdoor swimming pool', 'Spa', 'Massage', 'Fitness center', 'Garden', 'Tennis court'],
      },
      {
        category: 'Dining & drinks',
        items: ['Restaurant', 'Bar', 'Breakfast buffet', 'Room service', 'Poolside bar'],
      },
      {
        category: 'Services & conveniences',
        items: ['Free WiFi', 'Airport transfer', 'Concierge', 'Laundry service', 'Safety deposit boxes', 'Daily housekeeping', 'Meeting facilities'],
      },
      {
        category: 'For families',
        items: ['Family rooms', 'Kids club', 'Babysitting on request', 'Children 2–5 stay free (existing bed)'],
      },
    ],
    locationHighlights: [
      { name: 'Jimbaran Beach & seafood strip', distance: '5 km' },
      { name: 'Ngurah Rai International Airport', distance: '10 min drive' },
      { name: 'Kuta & Seminyak', distance: 'Short drive' },
      { name: 'Uluwatu Temple', distance: 'Scenic coastal drive' },
    ],
    policies: [
      {
        title: 'Check-in / Check-out',
        items: ['Check-in from 2:00 PM', 'Check-out until 12:00 PM', 'Reception open until midnight'],
      },
      {
        title: 'Children & extra beds',
        items: [
          'Children 2–5 years stay free using existing bed',
          'Extra bed policies vary by room — see room details on E Stays',
        ],
      },
      {
        title: 'Group bookings',
        items: ['Different policies may apply when booking more than 5 rooms', 'Contact E Stays for group rates'],
      },
    ],
    usefulFacts: [
      { label: 'Year opened', value: '1991' },
      { label: 'Last renovation', value: '2009' },
      { label: 'Number of rooms', value: '102' },
      { label: 'Distance to city center', value: '5 km' },
      { label: 'Airport transfer', value: 'Available (fee may apply)' },
    ],
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Ocean View', 'Breakfast Included', 'Fitness Center', 'Airport Transfer'],
  },

  'tri-shawa-resort': {
    tagline: 'Tranquil coastal resort in Prachuap Khiri Khan',
    aboutSections: [
      {
        title: 'Experience tranquility at E Stays Tri-Shawa Resort',
        body: 'Nestled in Prachuap Khiri Khan, Thailand, E Stays Tri-Shawa Resort offers a tranquil oasis for travellers seeking a peaceful retreat. This 4-star property, built in 2012 and renovated in 2021, has 27 well-appointed rooms. Check-in from 2:00 PM and check-out until 12:00 PM give you a relaxed start and finish to your stay. The resort sits 6 km from the city centre — close enough for convenience, far enough for serenity.',
      },
      {
        title: 'Entertainment & relaxation',
        body: 'Unwind at E Stays Tri-Shawa Resort with spa massages, a rejuvenating hot tub, and lush gardens ideal for reconnecting with nature. Professional therapists offer deep tissue and aromatherapy treatments. After exploring the coast, melt away stress in the hot tub surrounded by greenery.',
      },
      {
        title: 'Sports & beach activities',
        body: 'Indoor and outdoor pools, an on-site golf course, private beach, snorkeling, diving, and horseback riding along the shore keep active guests entertained. E Stays Tri-Shawa Resort is a haven for sports enthusiasts and nature lovers alike.',
      },
      {
        title: 'Luxurious, well-equipped rooms',
        body: 'Choose from Deluxe rooms, 1 Bedroom Ocean View, Pool Suite, Garden Villa, Suite 2 Bedroom, or Suite 3-Bedroom — each with air conditioning, balcony or terrace, bathrobes, mini bar, refrigerator, and free WiFi. Ocean-view and villa options offer space for couples, families, and groups.',
      },
      {
        title: 'Discover Klong Wan',
        body: 'The resort lies in Klong Wan, a charming fishing village with traditional wooden houses, morning markets, and stunning Gulf of Thailand sunrises. Nearby Khao Sam Roi Yot National Park offers hiking, Phraya Nakhon Cave, and pristine beaches.',
      },
    ],
    facilities: [
      {
        category: 'Things to do & relax',
        items: ['Spa & massage', 'Hot tub', 'Garden', 'Private beach', 'Snorkeling', 'Diving', 'Horseback riding', 'Tours'],
      },
      {
        category: 'Sports & recreation',
        items: ['Indoor pool', 'Outdoor pool', 'Golf course on-site', 'Golf within 3 km', 'Bicycle rental'],
      },
      {
        category: 'Dining & drinks',
        items: ['Restaurant', 'Coffee shop', 'Room service', 'BBQ facilities', 'Breakfast buffet', 'Continental breakfast', 'Snack bar'],
      },
      {
        category: 'Services & conveniences',
        items: ['Free WiFi in all rooms', 'Laundry & dry cleaning', 'Concierge', 'Luggage storage', 'Safety deposit boxes', 'Daily housekeeping', 'Meeting facilities', 'Airport transfer', 'Shuttle service', 'Free car park'],
      },
      {
        category: 'In-room amenities',
        items: ['Air conditioning', 'Balcony/terrace', 'Bathrobes', 'Hair dryer', 'Mini bar', 'Refrigerator', 'Satellite/cable TV', 'Free bottled water', 'Slippers'],
      },
      {
        category: 'For families',
        items: ['Family rooms', 'Kids club', 'Family/child friendly'],
      },
    ],
    locationHighlights: [
      { name: 'Ao Manao beach', distance: '3.5 km' },
      { name: 'King Mongkut Memorial Park', distance: '3.7 km' },
      { name: 'Nong Hin Railway Station', distance: '1.5 km' },
      { name: 'Khao Sam Roi Yot National Park', distance: '58 km' },
      { name: 'Hua Hin Airport', distance: '100 km' },
    ],
    policies: [
      {
        title: 'Check-in / Check-out',
        items: [
          'Check-in from 2:00 PM (until midnight)',
          'Check-out until 12:00 PM',
          'Reception open until midnight',
        ],
      },
      {
        title: 'Children & breakfast',
        items: ['Children aged 4–11 charged THB 350 for breakfast when using existing bed'],
      },
      {
        title: 'Group bookings',
        items: ['Different policies and supplements may apply when booking more than 5 rooms'],
      },
      {
        title: 'Getting around',
        items: ['Airport transfer fee approx. THB 5,000', 'Distance from city centre: 6 km', 'Free on-site parking'],
      },
    ],
    usefulFacts: [
      { label: 'Year opened', value: '2012' },
      { label: 'Last renovation', value: '2021' },
      { label: 'Number of rooms', value: '27' },
      { label: 'Restaurants on site', value: '2' },
      { label: 'Address', value: '332 Moo 1, Klongwan, Prachuap Khiri Khan 77000' },
    ],
    amenityNames: [
      'Free WiFi',
      'Swimming Pool',
      'Restaurant',
      'Bar',
      'Ocean View',
      'Parking',
      'Breakfast Included',
      'Spa',
      'Fitness Center',
    ],
  },

  'berjaya-langkawi-resort': {
    tagline: 'Tropical resort on Langkawi\'s pristine coastline',
    aboutSections: [
      {
        title: 'Island escape at E Stays Berjaya Langkawi Resort',
        body: 'E Stays Berjaya Langkawi Resort sits amid lush rainforest on Langkawi island, offering beach access, multiple dining venues, and spacious rooms for couples and families. Experience Malaysian hospitality with pool, spa, and water sports on your doorstep.',
      },
      {
        title: 'Rooms for every traveller',
        body: 'From deluxe rooms to suites and family options, E Stays Berjaya Langkawi Resort provides a range of accommodation with modern amenities, garden or sea views, and easy access to the resort\'s facilities.',
      },
    ],
    facilities: [
      {
        category: 'Recreation',
        items: ['Swimming pool', 'Private beach', 'Spa', 'Water sports', 'Tennis', 'Fitness center', 'Kids club'],
      },
      {
        category: 'Dining',
        items: ['Multiple restaurants', 'Bar', 'Room service', 'Breakfast buffet'],
      },
      {
        category: 'Services',
        items: ['Free WiFi', 'Airport transfer', 'Concierge', 'Tour desk', 'Parking', 'Daily housekeeping'],
      },
    ],
    locationHighlights: [
      { name: 'Langkawi Cable Car', distance: 'Short drive' },
      { name: 'Oriental Village', distance: 'Nearby' },
      { name: 'Langkawi International Airport', distance: 'Approx. 20 min' },
      { name: 'Pantai Kok beach', distance: 'On resort doorstep' },
    ],
    policies: [
      {
        title: 'Check-in / Check-out',
        items: ['Check-in from 3:00 PM', 'Check-out until 12:00 PM'],
      },
      {
        title: 'Resort policies',
        items: ['Non-smoking rooms available', 'Pets not allowed', 'Book flexible rates on E Stays'],
      },
    ],
    usefulFacts: [
      { label: 'Star rating', value: '4–5 stars' },
      { label: 'Location', value: 'Pantai Kok, Langkawi, Malaysia' },
      { label: 'Property type', value: 'Beach resort' },
    ],
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Ocean View', 'Breakfast Included', 'Fitness Center', 'Parking'],
  },
};

export function getArPropertyContent(slug: string): HotelRichContent | undefined {
  return AR_PROPERTY_CONTENT[slug];
}
