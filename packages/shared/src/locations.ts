export interface Destination {
  city: string;
  state: string;
  country: string;
  aliases: string[];
}

export const DESTINATIONS: Destination[] = [
  { city: 'New York', state: 'NY', country: 'USA', aliases: ['NYC', 'Manhattan', 'New York City'] },
  { city: 'Miami Beach', state: 'FL', country: 'USA', aliases: ['Miami', 'South Beach'] },
  { city: 'Aspen', state: 'CO', country: 'USA', aliases: ['Aspen Mountain', 'Colorado'] },
  { city: 'Chicago', state: 'IL', country: 'USA', aliases: ['Windy City', 'Chi-town'] },
  { city: 'Los Angeles', state: 'CA', country: 'USA', aliases: ['LA', 'Hollywood'] },
  { city: 'Napa', state: 'CA', country: 'USA', aliases: ['Napa Valley', 'Wine Country'] },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', aliases: ['Bombay', 'BOM'] },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', aliases: ['Bangalore', 'BLR', 'Bangaluru'] },
  { city: 'New Delhi', state: 'Delhi', country: 'India', aliases: ['Delhi', 'NCR'] },
  { city: 'Goa', state: 'Goa', country: 'India', aliases: ['Panaji', 'North Goa', 'South Goa'] },
  { city: 'Alleppey', state: 'Kerala', country: 'India', aliases: ['Alappuzha', 'Backwaters'] },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', aliases: ['Pink City'] },
  { city: 'Bangkok', state: 'Bangkok', country: 'Thailand', aliases: ['BKK', 'Krung Thep'] },
  { city: 'Phuket', state: 'Phuket', country: 'Thailand', aliases: ['Phuket Island'] },
  { city: 'Chiang Mai', state: 'Chiang Mai', country: 'Thailand', aliases: ['Chiangmai'] },
  { city: 'Koh Samui', state: 'Surat Thani', country: 'Thailand', aliases: ['Samui', 'Ko Samui'] },
  // Europe
  { city: 'London', state: 'England', country: 'United Kingdom', aliases: ['Greater London', 'UK'] },
  { city: 'Paris', state: 'Île-de-France', country: 'France', aliases: ['City of Paris'] },
  { city: 'Berlin', state: 'Berlin', country: 'Germany', aliases: [] },
  { city: 'Rome', state: 'Lazio', country: 'Italy', aliases: ['Roma'] },
  { city: 'Barcelona', state: 'Catalonia', country: 'Spain', aliases: [] },
  { city: 'Amsterdam', state: 'North Holland', country: 'Netherlands', aliases: [] },
  { city: 'Zurich', state: 'Zurich', country: 'Switzerland', aliases: ['Zürich'] },
  { city: 'Vienna', state: 'Vienna', country: 'Austria', aliases: ['Wien'] },
  { city: 'Prague', state: 'Prague', country: 'Czech Republic', aliases: ['Praha'] },
  { city: 'Lisbon', state: 'Lisbon', country: 'Portugal', aliases: ['Lisboa'] },
  { city: 'Dublin', state: 'Leinster', country: 'Ireland', aliases: [] },
  { city: 'Athens', state: 'Attica', country: 'Greece', aliases: [] },
  { city: 'Istanbul', state: 'Istanbul', country: 'Turkey', aliases: [] },
  { city: 'Moscow', state: 'Moscow', country: 'Russia', aliases: [] },
  // Middle East
  { city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', aliases: ['UAE', 'DXB'] },
  { city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates', aliases: [] },
  { city: 'Doha', state: 'Doha', country: 'Qatar', aliases: [] },
  { city: 'Riyadh', state: 'Riyadh', country: 'Saudi Arabia', aliases: [] },
  { city: 'Tel Aviv', state: 'Tel Aviv', country: 'Israel', aliases: [] },
  // Asia Pacific
  { city: 'Singapore', state: 'Singapore', country: 'Singapore', aliases: ['SG'] },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan', aliases: ['TYO'] },
  { city: 'Osaka', state: 'Osaka', country: 'Japan', aliases: [] },
  { city: 'Seoul', state: 'Seoul', country: 'South Korea', aliases: [] },
  { city: 'Hong Kong', state: 'Hong Kong', country: 'Hong Kong', aliases: ['HK'] },
  { city: 'Shanghai', state: 'Shanghai', country: 'China', aliases: [] },
  { city: 'Beijing', state: 'Beijing', country: 'China', aliases: [] },
  { city: 'Sydney', state: 'NSW', country: 'Australia', aliases: [] },
  { city: 'Melbourne', state: 'Victoria', country: 'Australia', aliases: [] },
  { city: 'Auckland', state: 'Auckland', country: 'New Zealand', aliases: [] },
  { city: 'Bali', state: 'Bali', country: 'Indonesia', aliases: ['Denpasar', 'Ubud'] },
  { city: 'Kuala Lumpur', state: 'Kuala Lumpur', country: 'Malaysia', aliases: ['KL'] },
  { city: 'Hanoi', state: 'Hanoi', country: 'Vietnam', aliases: [] },
  { city: 'Ho Chi Minh City', state: 'Ho Chi Minh', country: 'Vietnam', aliases: ['Saigon'] },
  { city: 'Colombo', state: 'Western', country: 'Sri Lanka', aliases: [] },
  { city: 'Kathmandu', state: 'Bagmati', country: 'Nepal', aliases: [] },
  { city: 'Male', state: 'Male', country: 'Maldives', aliases: ['Malé'] },
  // More India
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', aliases: ['Madras'] },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', aliases: [] },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', aliases: ['Calcutta'] },
  { city: 'Pune', state: 'Maharashtra', country: 'India', aliases: [] },
  { city: 'Udaipur', state: 'Rajasthan', country: 'India', aliases: ['City of Lakes'] },
  { city: 'Kochi', state: 'Kerala', country: 'India', aliases: ['Cochin'] },
  { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', aliases: [] },
  { city: 'Manali', state: 'Himachal Pradesh', country: 'India', aliases: [] },
  // More USA
  { city: 'San Francisco', state: 'CA', country: 'USA', aliases: ['SF', 'Bay Area'] },
  { city: 'Las Vegas', state: 'NV', country: 'USA', aliases: ['Vegas'] },
  { city: 'Seattle', state: 'WA', country: 'USA', aliases: [] },
  { city: 'Boston', state: 'MA', country: 'USA', aliases: [] },
  { city: 'Washington DC', state: 'DC', country: 'USA', aliases: ['Washington', 'DC'] },
  { city: 'Houston', state: 'TX', country: 'USA', aliases: [] },
  { city: 'Dallas', state: 'TX', country: 'USA', aliases: [] },
  { city: 'Honolulu', state: 'HI', country: 'USA', aliases: ['Hawaii', 'Oahu'] },
  // Americas
  { city: 'Toronto', state: 'Ontario', country: 'Canada', aliases: [] },
  { city: 'Vancouver', state: 'BC', country: 'Canada', aliases: [] },
  { city: 'Mexico City', state: 'CDMX', country: 'Mexico', aliases: ['CDMX'] },
  { city: 'Cancún', state: 'Quintana Roo', country: 'Mexico', aliases: ['Cancun'] },
  { city: 'São Paulo', state: 'São Paulo', country: 'Brazil', aliases: ['Sao Paulo'] },
  { city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', aliases: ['Rio'] },
  { city: 'Buenos Aires', state: 'Buenos Aires', country: 'Argentina', aliases: [] },
  // Africa
  { city: 'Cape Town', state: 'Western Cape', country: 'South Africa', aliases: [] },
  { city: 'Johannesburg', state: 'Gauteng', country: 'South Africa', aliases: ['Joburg'] },
  { city: 'Marrakech', state: 'Marrakech', country: 'Morocco', aliases: ['Marrakesh'] },
  { city: 'Cairo', state: 'Cairo', country: 'Egypt', aliases: [] },
  { city: 'Nairobi', state: 'Nairobi', country: 'Kenya', aliases: [] },
];

export function formatDestination(d: Destination): string {
  return `${d.city}, ${d.state}, ${d.country}`;
}

function matchesQuery(dest: Destination, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const terms = [dest.city, dest.state, dest.country, ...dest.aliases].map((t) => t.toLowerCase());
  return terms.some((t) => t.includes(q) || q.includes(t));
}

export function searchDestinations(
  query: string,
  limit = 8,
  country?: string
): Array<Destination & { label: string }> {
  const q = query.trim();
  let pool = DESTINATIONS;
  if (country) {
    pool = pool.filter((d) => d.country.toLowerCase() === country.toLowerCase());
  }
  if (!q) {
    return pool.slice(0, limit).map((d) => ({ ...d, label: formatDestination(d) }));
  }
  return pool.filter((d) => matchesQuery(d, q))
    .slice(0, limit)
    .map((d) => ({ ...d, label: formatDestination(d) }));
}

export function getCitiesByCountry(country: string, limit = 50): Array<Destination & { label: string }> {
  return DESTINATIONS.filter((d) => d.country.toLowerCase() === country.toLowerCase())
    .slice(0, limit)
    .map((d) => ({ ...d, label: formatDestination(d) }));
}

export function resolveDestinationQuery(query: string): { city?: string; country?: string } {
  const q = query.trim();
  if (!q) return {};

  for (const dest of DESTINATIONS) {
    if (matchesQuery(dest, q)) {
      return { city: dest.city, country: dest.country };
    }
  }

  return { city: q };
}
