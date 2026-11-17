import type { Capability } from '@party/shared';

interface SeedCategory {
  slug: string;
  icon: string;
  name: { ar: string; he: string; en: string };
  allowed: Capability[];
  defaults: Capability[];
}

const SERVICE: Capability[] = ['services', 'packages', 'portfolio', 'booking', 'calendar', 'timeSlots', 'quotes', 'negotiation', 'discounts', 'reviews', 'team', 'analytics'];
const VENUE: Capability[] = [...SERVICE, 'capacity', 'multiDay'];
const STORE: Capability[] = ['products', 'inventory', 'packages', 'portfolio', 'quotes', 'negotiation', 'discounts', 'reviews', 'team', 'analytics'];
const RENTAL: Capability[] = ['products', 'inventory', 'portfolio', 'booking', 'calendar', 'multiDay', 'capacity', 'rentals', 'quotes', 'negotiation', 'discounts', 'reviews', 'team', 'analytics'];

/** Initial categories. Admins can add more at runtime — nothing here is required by code. */
export const SEED_CATEGORIES: SeedCategory[] = [
  { slug: 'venues', icon: '🏛️', name: { ar: 'قاعات وحدائق', he: 'אולמות וגנים', en: 'Venues & Gardens' }, allowed: VENUE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes', 'negotiation'] },
  { slug: 'photography', icon: '📸', name: { ar: 'تصوير فوتوغرافي وفيديو', he: 'צילום ווידאו', en: 'Photography & Video' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes'] },
  { slug: 'music', icon: '🎧', name: { ar: 'دي جي وفرق موسيقية', he: 'די ג׳יי ולהקות', en: 'DJs & Bands' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes'] },
  { slug: 'decoration', icon: '💐', name: { ar: 'زينة وورود', he: 'עיצוב ופרחים', en: 'Decoration & Flowers' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'quotes'] },
  { slug: 'catering', icon: '🍽️', name: { ar: 'ضيافة وبوفيه', he: 'קייטרינג', en: 'Catering' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'quotes', 'negotiation'] },
  { slug: 'cakes-sweets', icon: '🎂', name: { ar: 'كيك وحلويات', he: 'עוגות וקינוחים', en: 'Cakes & Sweets' }, allowed: STORE, defaults: ['products', 'portfolio', 'quotes'] },
  { slug: 'cars', icon: '🚗', name: { ar: 'سيارات أفراح', he: 'רכבי חתונה', en: 'Wedding Cars' }, allowed: RENTAL, defaults: ['products', 'portfolio', 'booking', 'calendar', 'quotes'] },
  { slug: 'fashion', icon: '👗', name: { ar: 'فساتين وبدلات', he: 'שמלות וחליפות', en: 'Dresses & Suits' }, allowed: [...STORE, 'booking', 'calendar', 'multiDay', 'rentals'], defaults: ['products', 'portfolio', 'quotes'] },
  { slug: 'makeup', icon: '💄', name: { ar: 'مكياج وتجميل', he: 'איפור וטיפוח', en: 'Makeup & Beauty' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar'] },
  { slug: 'equipment', icon: '🪑', name: { ar: 'تأجير معدات', he: 'השכרת ציוד', en: 'Equipment Rental' }, allowed: RENTAL, defaults: ['products', 'inventory', 'booking', 'calendar', 'multiDay', 'rentals', 'quotes'] },
  { slug: 'lighting-sound', icon: '💡', name: { ar: 'إضاءة وصوت', he: 'תאורה והגברה', en: 'Lighting & Sound' }, allowed: RENTAL, defaults: ['services', 'products', 'booking', 'calendar', 'quotes'] },
  { slug: 'gifts', icon: '🎁', name: { ar: 'هدايا وتوزيعات', he: 'מתנות ומזכרות', en: 'Gifts & Favors' }, allowed: STORE, defaults: ['products', 'portfolio', 'quotes'] },
  { slug: 'entertainment', icon: '🪄', name: { ar: 'تفعيل وعروض للأطفال', he: 'הפעלות ומופעים לילדים', en: 'Party Entertainers' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes'] },
  { slug: 'workshops', icon: '🎨', name: { ar: 'ورشات وأنشطة إبداعية', he: 'סדנאות ויצירה', en: 'Creative Workshops' }, allowed: SERVICE, defaults: ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes'] },
  { slug: 'party-favors', icon: '🛍️', name: { ar: 'هدايا صغيرة للأصحاب', he: 'מתנות קטנות לחברים', en: 'Party Bags & Little Gifts' }, allowed: STORE, defaults: ['products', 'packages', 'portfolio', 'quotes'] },
  { slug: 'attractions', icon: '🎪', name: { ar: 'نطاطات وزوايا ألعاب', he: 'מתנפחים ופינות משחק', en: 'Bouncy Castles & Soft Play' }, allowed: RENTAL, defaults: ['products', 'portfolio', 'booking', 'calendar', 'quotes'] },
];
