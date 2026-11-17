import type { DemoBusiness } from './demo.data.js';

/** Fictional examples; package contents describe demo offerings only. */
export const KIDS_DEMO_BUSINESSES: DemoBusiness[] = [
  {
    category: 'entertainment',
    name: { ar: 'فقاعات وضحكات — تجريبي', he: 'בועות וחיוכים — דמו', en: 'Bubbles & Giggles — Demo' },
    description: { ar: 'عرض فقاعات وألعاب ورسم وجوه للصغار. مصلحة خيالية للعرض.', he: 'מופע בועות, משחקי חברה וציורי פנים לקטנטנים. עסק דמיוני להדגמה.', en: 'Bubble shows, party games and face painting for little ones. Fictional demo business.' },
    cities: ['الناصرة', 'נצרת', 'Nazareth'], phone: '0500000101',
    images: ['1530103862676-de8c9debad1d'],
    offerings: [{ kind: 'service', title: { ar: 'عرض فقاعات وألعاب — ساعة', he: 'שעת בועות ומשחקים', en: 'One-hour bubbles & games' }, model: 'starting_from', amount: 650, includes: ['Bubble show', 'Group games', 'Music'] }],
  },
  {
    category: 'workshops',
    name: { ar: 'ألوان صغيرة — تجريبي', he: 'צבעים קטנים — דמו', en: 'Little Makers — Demo' },
    description: { ar: 'ورشات أشغال وسلايم وتزيين كب كيك، مع عمل يأخذه كل طفل للبيت. مصلحة خيالية.', he: 'סדנאות יצירה, סליים וקישוט קאפקייקס, עם יצירה שכל ילד לוקח הביתה. עסק דמיוני.', en: 'Crafts, slime and cupcake decorating, with a creation to take home. Fictional demo business.' },
    cities: ['حيفا', 'חיפה', 'Haifa'], phone: '0500000102',
    images: ['1513364776144-60967b0f800f'],
    offerings: [{ kind: 'service', title: { ar: 'ورشة إبداع — للطفل', he: 'סדנת יצירה — לילד', en: 'Creative workshop — per child' }, model: 'per_person', amount: 65, includes: ['Materials', 'Instructor', 'Take-home creation'] }],
  },
  {
    category: 'party-favors',
    name: { ar: 'مفاجأة لكل صاحب — تجريبي', he: 'הפתעה לכל חבר — דמו', en: 'A Gift for Every Friend — Demo' },
    description: { ar: 'أكياس مفاجآت بأسماء الضيوف، أطقم أشغال وهدايا صغيرة حسب العمر. مصلحة خيالية.', he: 'שקיות הפתעה עם שמות האורחים, ערכות יצירה ומתנות קטנות לפי גיל. עסק דמיוני.', en: 'Personalised surprise bags, craft kits and little gifts by age. Fictional demo business.' },
    cities: ['الناصرة', 'נצרת', 'Nazareth'], phone: '0500000103',
    images: ['1549465220-1a8b9238cd48'],
    offerings: [{ kind: 'product', title: { ar: 'كيس مفاجآت — للقطعة', he: 'שקית הפתעה — ליחידה', en: 'Surprise bag — each' }, model: 'starting_from', amount: 18, includes: ['Personalised label', 'Age-appropriate contents on request'] }],
  },
  {
    category: 'attractions',
    name: { ar: 'حديقة المرح — تجريبي', he: 'גינת הכיף — דמו', en: 'Play Garden — Demo' },
    description: { ar: 'زاوية ألعاب طرية للصغار ونطاطات للحديقة، حسب العمر والمساحة. مصلحة خيالية.', he: 'פינת משחק רכה לקטנטנים ומתנפחים לגינה לפי גיל וגודל המקום. עסק דמיוני.', en: 'Soft play for little ones and garden inflatables matched to age and space. Fictional demo business.' },
    cities: ['حيفا', 'חיפה', 'Haifa'], phone: '0500000104',
    images: ['1530103862676-de8c9debad1d'],
    offerings: [{ kind: 'product', title: { ar: 'زاوية ألعاب — لليوم', he: 'פינת משחק — ליום', en: 'Soft play corner — per day' }, model: 'starting_from', amount: 900, includes: ['Soft play setup', 'Delivery area confirmed by vendor'] }],
  },
];
