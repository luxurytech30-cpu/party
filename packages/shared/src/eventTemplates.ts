import type { EventType } from './schemas.js';

/**
 * Default checklist per party type, as category slugs (data, not code paths —
 * unknown/inactive slugs are simply skipped). Order = suggested planning order.
 */
export const EVENT_TEMPLATES: Record<EventType, string[]> = {
  wedding: ['venues', 'photography', 'music', 'catering', 'decoration', 'cakes-sweets', 'fashion', 'makeup', 'cars', 'lighting-sound', 'gifts'],
  engagement: ['venues', 'photography', 'music', 'decoration', 'catering', 'cakes-sweets', 'makeup'],
  henna: ['venues', 'music', 'decoration', 'catering', 'fashion', 'makeup', 'cakes-sweets'],
  birthday: ['entertainment', 'workshops', 'party-favors', 'attractions', 'decoration', 'cakes-sweets', 'venues', 'catering', 'music', 'gifts'],
  graduation: ['venues', 'photography', 'catering', 'decoration', 'music'],
  corporate: ['venues', 'catering', 'lighting-sound', 'photography', 'equipment'],
  other: [],
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  wedding: '💍',
  engagement: '💐',
  henna: '🌿',
  birthday: '🎂',
  graduation: '🎓',
  corporate: '🏢',
  other: '✨',
};
