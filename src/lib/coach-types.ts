// The shape of a coach as shown to students on the marketplace. Built purely
// from the `coaches` database table — the admin panel is the single source
// of truth for what students see.
export interface PublicCoach {
  id: string;
  slug: string;
  name: string;
  title: string;
  rating: number;
  reviews: number;
  tags: string[];
  price: string;
  priceValue: number;
  image: string;
  experience: string;
  bio: string;
  email: string;
  priority: string;
  languages: string[];
  certificates: string[];
  introVideoUrl: string;
}
