import { PropertyType, RoleName } from '@prisma/client';

export interface PropertySeed {
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  starRating: number;
  propertyType: PropertyType;
  status: 'ACTIVE' | 'PENDING';
  ownerKey: 'grandPlaza' | 'seaView';
  amenityNames: string[];
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  roomTypes: {
    name: string;
    description: string;
    maxOccupancy: number;
    bedType: string;
    basePrice: number;
    rooms: { number: string; floor: number }[];
  }[];
}

export const PROPERTIES: PropertySeed[] = [
  // ─── USA ───────────────────────────────────────────────────────────
  {
    name: 'Grand Plaza Hotel',
    slug: 'grand-plaza-hotel',
    description: 'An iconic 5-star luxury hotel in downtown Manhattan with world-class amenities, Michelin-starred dining, and breathtaking city skyline views from every room.',
    address: '100 Park Avenue', city: 'New York', state: 'NY', country: 'USA', postalCode: '10017',
    starRating: 5, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Fitness Center', 'Restaurant', 'Room Service', 'Bar', 'Parking', 'Business Center', 'Conference Room', 'City View', 'Breakfast Included'],
    roomTypes: [
      { name: 'Deluxe King Room', description: 'Spacious king room with city views', maxOccupancy: 2, bedType: 'King', basePrice: 299, rooms: [{ number: '501', floor: 5 }, { number: '502', floor: 5 }, { number: '601', floor: 6 }] },
      { name: 'Executive Suite', description: 'Luxury suite with living area', maxOccupancy: 3, bedType: 'King + Sofa', basePrice: 549, rooms: [{ number: '801', floor: 8 }, { number: '802', floor: 8 }] },
      { name: 'Standard Double', description: 'Comfortable double room', maxOccupancy: 4, bedType: 'Double', basePrice: 199, rooms: [{ number: '301', floor: 3 }, { number: '302', floor: 3 }, { number: '303', floor: 3 }] },
    ],
  },
  {
    name: 'Sea View Resort & Spa',
    slug: 'sea-view-resort',
    description: 'A stunning beachfront 4-star resort on Miami Beach with direct ocean access, infinity pool, world-class spa, and award-winning seafood restaurant.',
    address: '1 Ocean Drive', city: 'Miami Beach', state: 'FL', country: 'USA', postalCode: '33139',
    starRating: 4, propertyType: 'RESORT', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Ocean View', 'Balcony', 'Breakfast Included', 'Fitness Center'],
    roomTypes: [
      { name: 'Ocean View King', description: 'Panoramic ocean views', maxOccupancy: 2, bedType: 'King', basePrice: 349, rooms: [{ number: '201', floor: 2 }, { number: '202', floor: 2 }, { number: '203', floor: 2 }] },
      { name: 'Garden Suite', description: 'Tropical garden views', maxOccupancy: 2, bedType: 'Queen', basePrice: 249, rooms: [{ number: '101', floor: 1 }, { number: '102', floor: 1 }, { number: '103', floor: 1 }] },
    ],
  },
  {
    name: 'Mountain Lodge Retreat',
    slug: 'mountain-lodge-retreat',
    description: 'A charming alpine boutique lodge in Aspen surrounded by pristine wilderness. Perfect for skiing, hiking, and cozy fireside evenings.',
    address: '42 Alpine Way', city: 'Aspen', state: 'CO', country: 'USA', postalCode: '81611',
    starRating: 4, propertyType: 'BOUTIQUE', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Restaurant', 'Parking', 'Pet Friendly', 'Breakfast Included'],
    roomTypes: [
      { name: 'Cabin Room', description: 'Rustic mountain views', maxOccupancy: 2, bedType: 'Queen', basePrice: 179, rooms: [{ number: 'C1', floor: 1 }, { number: 'C2', floor: 1 }, { number: 'C3', floor: 1 }] },
    ],
  },
  {
    name: 'Chicago Lakeside Inn',
    slug: 'chicago-lakeside-inn',
    description: 'Affordable 3-star comfort on the shores of Lake Michigan. Great value for business and leisure travellers exploring the Windy City.',
    address: '2200 Lake Shore Drive', city: 'Chicago', state: 'IL', country: 'USA', postalCode: '60614',
    starRating: 3, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Parking', 'Fitness Center', 'Air Conditioning'],
    roomTypes: [
      { name: 'Standard Queen', description: 'Cozy queen room', maxOccupancy: 2, bedType: 'Queen', basePrice: 129, rooms: [{ number: '201', floor: 2 }, { number: '202', floor: 2 }, { number: '203', floor: 2 }, { number: '204', floor: 2 }] },
    ],
  },
  {
    name: 'LA Skyline Apartments',
    slug: 'la-skyline-apartments',
    description: 'Modern serviced apartments in downtown Los Angeles with full kitchens, rooftop pool, and stunning Hollywood Hills views. Ideal for extended stays.',
    address: '850 South Figueroa St', city: 'Los Angeles', state: 'CA', country: 'USA', postalCode: '90017',
    starRating: 4, propertyType: 'SERVICE_APARTMENT', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Fitness Center', 'Parking', 'Air Conditioning', 'Balcony'],
    roomTypes: [
      { name: 'Studio Apartment', description: 'Open-plan studio with kitchenette', maxOccupancy: 2, bedType: 'Queen', basePrice: 159, rooms: [{ number: 'S1', floor: 10 }, { number: 'S2', floor: 10 }, { number: 'S3', floor: 11 }] },
      { name: 'One-Bedroom Suite', description: 'Separate bedroom and living area', maxOccupancy: 3, bedType: 'King', basePrice: 219, rooms: [{ number: 'B1', floor: 12 }, { number: 'B2', floor: 12 }] },
    ],
  },
  {
    name: 'Napa Valley Vineyard Villa',
    slug: 'napa-valley-villa',
    description: 'Exclusive private villa nestled among Napa Valley vineyards. Features private pool, wine cellar, chef\'s kitchen, and panoramic valley views.',
    address: '1450 Silverado Trail', city: 'Napa', state: 'CA', country: 'USA', postalCode: '94558',
    starRating: 5, propertyType: 'VILLA', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Parking', 'Balcony', 'Pet Friendly'],
    roomTypes: [
      { name: 'Vineyard Villa', description: 'Entire 4-bedroom villa', maxOccupancy: 8, bedType: 'Multiple', basePrice: 599, rooms: [{ number: 'V1', floor: 1 }] },
    ],
  },
  // ─── INDIA ─────────────────────────────────────────────────────────
  {
    name: 'E Stays Imperial Grand Mumbai',
    slug: 'imperial-grand-mumbai',
    description: 'Mumbai\'s finest 5-star address in Colaba. Heritage elegance meets modern luxury with award-winning restaurants and the city\'s best harbour views.',
    address: '123 Marine Drive', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400002',
    latitude: 18.9432, longitude: 72.8236,
    googleMapsUrl: 'https://maps.google.com/?q=18.9432,72.8236',
    starRating: 5, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Room Service', 'Bar', 'Fitness Center', 'Business Center', 'Ocean View', 'Breakfast Included'],
    roomTypes: [
      { name: 'Harbour View Suite', description: 'Arabian Sea views', maxOccupancy: 2, bedType: 'King', basePrice: 220, rooms: [{ number: '801', floor: 8 }, { number: '802', floor: 8 }] },
      { name: 'Deluxe Room', description: 'City-facing deluxe', maxOccupancy: 2, bedType: 'Queen', basePrice: 140, rooms: [{ number: '401', floor: 4 }, { number: '402', floor: 4 }, { number: '403', floor: 4 }] },
    ],
  },
  {
    name: 'E Stays Bengaluru Tech Park Hotel',
    slug: 'bengaluru-tech-park-hotel',
    description: 'Premium 4-star business hotel adjacent to Electronic City. Rooftop bar, co-working lounge, and express check-in for the modern professional.',
    address: '45 Electronic City Phase 1', city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560100',
    latitude: 12.8456, longitude: 77.6603,
    googleMapsUrl: 'https://maps.google.com/?q=12.8456,77.6603',
    starRating: 4, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Restaurant', 'Bar', 'Fitness Center', 'Business Center', 'Conference Room', 'Parking', 'Air Conditioning'],
    roomTypes: [
      { name: 'Business King', description: 'Work desk and ergonomic chair', maxOccupancy: 2, bedType: 'King', basePrice: 95, rooms: [{ number: '301', floor: 3 }, { number: '302', floor: 3 }, { number: '303', floor: 3 }] },
    ],
  },
  {
    name: 'E Stays Delhi Karol Bagh Inn',
    slug: 'delhi-karol-bagh-inn',
    description: 'Best-value 3-star hotel in the heart of Karol Bagh. Walking distance to metro, markets, and Old Delhi. Clean, comfortable, and friendly.',
    address: '18 Ajmal Khan Road', city: 'New Delhi', state: 'Delhi', country: 'India', postalCode: '110005',
    latitude: 28.6519, longitude: 77.1909,
    googleMapsUrl: 'https://maps.google.com/?q=28.6519,77.1909',
    starRating: 3, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Restaurant', 'Air Conditioning', 'Parking'],
    roomTypes: [
      { name: 'Standard Room', description: 'AC room with attached bath', maxOccupancy: 2, bedType: 'Double', basePrice: 45, rooms: [{ number: '101', floor: 1 }, { number: '102', floor: 1 }, { number: '201', floor: 2 }, { number: '202', floor: 2 }] },
    ],
  },
  {
    name: 'E Stays Mumbai Executive Suites',
    slug: 'mumbai-executive-suites',
    description: 'Fully furnished service apartments in Bandra Kurla Complex. Weekly housekeeping, gym access, and 24/7 concierge for corporate stays.',
    address: 'G Block, BKC', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400051',
    latitude: 19.0667, longitude: 72.8679,
    googleMapsUrl: 'https://maps.google.com/?q=19.0667,72.8679',
    starRating: 4, propertyType: 'SERVICE_APARTMENT', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Fitness Center', 'Parking', 'Air Conditioning', 'Laundry Service'],
    roomTypes: [
      { name: 'Executive Studio', description: 'Furnished studio with kitchen', maxOccupancy: 2, bedType: 'Queen', basePrice: 75, rooms: [{ number: 'A1', floor: 5 }, { number: 'A2', floor: 5 }, { number: 'A3', floor: 6 }] },
    ],
  },
  {
    name: 'E Stays Goa Beachfront House',
    slug: 'goa-beachfront-house',
    description: 'Private beach house in North Goa with direct sand access, tropical garden, BBQ area, and 3 bedrooms. Perfect for families and groups.',
    address: 'Calangute Beach Road', city: 'Goa', state: 'Goa', country: 'India', postalCode: '403516',
    latitude: 15.5439, longitude: 73.7553,
    googleMapsUrl: 'https://maps.google.com/?q=15.5439,73.7553',
    starRating: 4, propertyType: 'HOUSE', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Parking', 'Balcony', 'Pet Friendly', 'Air Conditioning'],
    roomTypes: [
      { name: 'Beach House', description: 'Entire 3-bedroom house', maxOccupancy: 6, bedType: 'Multiple', basePrice: 120, rooms: [{ number: 'H1', floor: 1 }] },
    ],
  },
  {
    name: 'E Stays Kerala Backwater Resort',
    slug: 'kerala-backwater-resort',
    description: 'Serene 5-star resort on the Alleppey backwaters. Traditional houseboat excursions, Ayurvedic spa, and authentic Kerala cuisine.',
    address: 'Finishing Point, Alleppey', city: 'Alleppey', state: 'Kerala', country: 'India', postalCode: '688013',
    latitude: 9.4981, longitude: 76.3388,
    googleMapsUrl: 'https://maps.google.com/?q=9.4981,76.3388',
    starRating: 5, propertyType: 'RESORT', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Breakfast Included'],
    roomTypes: [
      { name: 'Backwater Cottage', description: 'Private cottage on the water', maxOccupancy: 2, bedType: 'King', basePrice: 180, rooms: [{ number: 'C1', floor: 1 }, { number: 'C2', floor: 1 }, { number: 'C3', floor: 1 }] },
      { name: 'Houseboat Suite', description: 'Luxury houseboat experience', maxOccupancy: 2, bedType: 'Queen', basePrice: 250, rooms: [{ number: 'HB1', floor: 0 }] },
    ],
  },
  {
    name: 'E Stays Jaipur Heritage Homestay',
    slug: 'jaipur-heritage-homestay',
    description: 'Authentic Rajasthani homestay in a restored haveli near Amber Fort. Home-cooked meals, courtyard garden, and warm family hospitality.',
    address: '12 Kunda Mohalla, Amer', city: 'Jaipur', state: 'Rajasthan', country: 'India', postalCode: '302028',
    latitude: 26.9855, longitude: 75.8513,
    googleMapsUrl: 'https://maps.google.com/?q=26.9855,75.8513',
    starRating: 3, propertyType: 'HOMESTAY', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Breakfast Included', 'Parking', 'Air Conditioning'],
    roomTypes: [
      { name: 'Heritage Room', description: 'Traditional decor with modern amenities', maxOccupancy: 2, bedType: 'Queen', basePrice: 35, rooms: [{ number: 'R1', floor: 1 }, { number: 'R2', floor: 1 }, { number: 'R3', floor: 2 }] },
    ],
  },
  // ─── THAILAND ──────────────────────────────────────────────────────
  {
    name: 'Bangkok Sky Tower Hotel',
    slug: 'bangkok-sky-tower',
    description: 'Ultra-modern 5-star tower in Sukhumvit with infinity rooftop pool, sky bar, and panoramic views of the Bangkok skyline.',
    address: '88 Sukhumvit Road', city: 'Bangkok', state: 'Bangkok', country: 'Thailand', postalCode: '10110',
    starRating: 5, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Fitness Center', 'City View', 'Breakfast Included'],
    roomTypes: [
      { name: 'Skyline King', description: 'Floor-to-ceiling city views', maxOccupancy: 2, bedType: 'King', basePrice: 120, rooms: [{ number: '4501', floor: 45 }, { number: '4502', floor: 45 }] },
      { name: 'Premier Double', description: 'Spacious twin room', maxOccupancy: 2, bedType: 'Twin', basePrice: 85, rooms: [{ number: '3201', floor: 32 }, { number: '3202', floor: 32 }, { number: '3203', floor: 32 }] },
    ],
  },
  {
    name: 'Phuket Paradise Resort',
    slug: 'phuket-paradise-resort',
    description: 'Tropical 4-star beach resort on Patong Beach with water sports, beachfront dining, kids club, and stunning Andaman Sea sunsets.',
    address: '156 Patong Beach Road', city: 'Phuket', state: 'Phuket', country: 'Thailand', postalCode: '83150',
    starRating: 4, propertyType: 'RESORT', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Restaurant', 'Bar', 'Spa', 'Ocean View', 'Fitness Center', 'Breakfast Included'],
    roomTypes: [
      { name: 'Beachfront Bungalow', description: 'Steps from the sand', maxOccupancy: 2, bedType: 'King', basePrice: 110, rooms: [{ number: 'B1', floor: 1 }, { number: 'B2', floor: 1 }, { number: 'B3', floor: 1 }] },
    ],
  },
  {
    name: 'Chiang Mai Garden Hotel',
    slug: 'chiang-mai-garden-hotel',
    description: 'Peaceful 3-star hotel in the Old City surrounded by lush gardens. Walking distance to temples, night markets, and mountain trails.',
    address: '22 Ratchadamnoen Road', city: 'Chiang Mai', state: 'Chiang Mai', country: 'Thailand', postalCode: '50200',
    starRating: 3, propertyType: 'HOTEL', status: 'ACTIVE', ownerKey: 'grandPlaza',
    amenityNames: ['Free WiFi', 'Restaurant', 'Parking', 'Air Conditioning', 'Breakfast Included'],
    roomTypes: [
      { name: 'Garden View Room', description: 'Overlooks tropical gardens', maxOccupancy: 2, bedType: 'Queen', basePrice: 40, rooms: [{ number: '101', floor: 1 }, { number: '102', floor: 1 }, { number: '201', floor: 2 }] },
    ],
  },
  {
    name: 'Bangkok City Suites',
    slug: 'bangkok-city-suites',
    description: 'Contemporary serviced apartments in Silom with full kitchen, washer-dryer, and rooftop terrace. Perfect for long-stay business travellers.',
    address: '55 Silom Road', city: 'Bangkok', state: 'Bangkok', country: 'Thailand', postalCode: '10500',
    starRating: 4, propertyType: 'SERVICE_APARTMENT', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Fitness Center', 'Swimming Pool', 'Air Conditioning', 'Laundry Service'],
    roomTypes: [
      { name: 'City Studio', description: 'Modern studio with kitchen', maxOccupancy: 2, bedType: 'Queen', basePrice: 55, rooms: [{ number: 'S1', floor: 8 }, { number: 'S2', floor: 8 }, { number: 'S3', floor: 9 }] },
    ],
  },
  {
    name: 'Koh Samui Ocean Villa',
    slug: 'koh-samui-ocean-villa',
    description: 'Private cliff-top villa on Koh Samui with infinity pool, personal chef on request, and uninterrupted Gulf of Thailand views.',
    address: '14 Chaweng Noi Hill', city: 'Koh Samui', state: 'Surat Thani', country: 'Thailand', postalCode: '84320',
    starRating: 5, propertyType: 'VILLA', status: 'ACTIVE', ownerKey: 'seaView',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Ocean View', 'Balcony', 'Parking'],
    roomTypes: [
      { name: 'Cliff Villa', description: 'Private 3-bedroom cliff-top villa', maxOccupancy: 6, bedType: 'Multiple', basePrice: 280, rooms: [{ number: 'V1', floor: 1 }] },
    ],
  },
];
