import { fetchFeaturedHotels } from '@/lib/server-api';
import { HomePageContent } from '@/components/HomePageContent';

export default async function HomePage() {
  const initialFeatured = await fetchFeaturedHotels();
  return <HomePageContent initialFeatured={initialFeatured} />;
}
