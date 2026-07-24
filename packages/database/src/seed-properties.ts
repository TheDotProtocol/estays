import { PropertyType } from '@prisma/client';

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

/** AR Hospitality collection — real E Stays inventory (Agoda-sourced via import-ar). */
export const PROPERTIES: PropertySeed[] = [
  {
    name: 'E Stays Sandcastle Mara Lodge',
    slug: 'sandcastle-mara-lodge',
    description: 'Affordable budget lodge on the edge of the Maasai Mara. Tented rooms, safari packages, and wildlife views at Sandcastle Mara Lodge.',
    address: 'Maasai Mara National Reserve, C12, Sekenani', city: 'Narok', state: 'Narok County', country: 'Kenya', postalCode: '20500',
    starRating: 3, propertyType: 'BOUTIQUE', status: 'ACTIVE',
    amenityNames: ['Free WiFi', 'Restaurant', 'Parking', 'Breakfast Included', 'Safari Tours'],
    roomTypes: [
      { name: '2 Nights Budget Lodge Accommodation', description: 'Budget double room package', maxOccupancy: 2, bedType: 'Double', basePrice: 65, rooms: [{ number: 'B1', floor: 1 }] },
    ],
  },
  {
    name: 'E Stays Grand Sunset Phuket',
    slug: 'grand-sunset-phuket',
    description: 'Boutique beach hotel on Phuket\'s sunset coast with rooftop pool, Thai-fusion restaurant, and rooms steps from the Andaman Sea.',
    address: 'Karo Beach Road', city: 'Phuket', state: 'Phuket', country: 'Thailand', postalCode: '83150',
    starRating: 4, propertyType: 'HOTEL', status: 'ACTIVE',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Restaurant', 'Bar', 'Ocean View', 'Breakfast Included', 'Air Conditioning'],
    roomTypes: [
      { name: 'Standard Double', description: 'Comfortable double with garden view', maxOccupancy: 2, bedType: 'Double', basePrice: 42, rooms: [{ number: '201', floor: 2 }] },
    ],
  },
  {
    name: 'E Stays Keraton Jimbaran',
    slug: 'keraton-jimbaran',
    description: 'Balinese resort in Jimbaran Bay with traditional architecture, lagoon pools, spa pavilion, and direct access to seafood dining on the beach.',
    address: 'Jl. Wana Segara, Jimbaran', city: 'Jimbaran', state: 'Bali', country: 'Indonesia', postalCode: '80361',
    starRating: 5, propertyType: 'RESORT', status: 'ACTIVE',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Ocean View', 'Breakfast Included', 'Fitness Center'],
    roomTypes: [
      { name: 'Deluxe Garden Room', description: 'Tropical garden terrace', maxOccupancy: 2, bedType: 'King', basePrice: 95, rooms: [{ number: 'G1', floor: 1 }] },
    ],
  },
  {
    name: 'E Stays Tri-Shawa Resort',
    slug: 'tri-shawa-resort',
    description: 'Coastal resort on the Gulf of Thailand with palm-lined beach, infinity pool, and relaxed Thai hospitality.',
    address: 'Ao Manao Beach', city: 'Prachuap Khiri Khan', state: 'Prachuap Khiri Khan', country: 'Thailand', postalCode: '77000',
    starRating: 4, propertyType: 'RESORT', status: 'ACTIVE',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Restaurant', 'Bar', 'Ocean View', 'Parking', 'Breakfast Included'],
    roomTypes: [
      { name: 'Standard Room', description: 'Pool or garden view', maxOccupancy: 2, bedType: 'Queen', basePrice: 38, rooms: [{ number: '101', floor: 1 }] },
    ],
  },
  {
    name: 'E Stays Berjaya Langkawi Resort',
    slug: 'berjaya-langkawi-resort',
    description: 'Iconic beachfront resort on Langkawi island with rainforest setting, multiple pools, water sports, and spacious rooms steps from the Andaman Sea.',
    address: 'Karong, Mukim Bohor', city: 'Langkawi', state: 'Kedah', country: 'Malaysia', postalCode: '07000',
    starRating: 5, propertyType: 'RESORT', status: 'ACTIVE',
    amenityNames: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Ocean View', 'Fitness Center', 'Breakfast Included', 'Parking'],
    roomTypes: [
      { name: 'Rainforest Chalet', description: 'Surrounded by tropical greenery', maxOccupancy: 2, bedType: 'King', basePrice: 88, rooms: [{ number: 'R1', floor: 1 }] },
    ],
  },
];
