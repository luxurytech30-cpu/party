import type { DemoBusiness } from './demo.data.js';

export const GUEST_GIFT_DEMOS: DemoBusiness[] = [
  {
    category: 'gifts', name: { he: 'מחשבה במתנה — דמו', ar: 'هدية من القلب — تجريبي', en: 'Thoughtful Gifts — Demo' },
    description: { he: 'מארזי אירוח, מתנות אישיות ומזכרות לחוגג. עסק דמיוני להדגמה; פרטי המארז והזמינות בתיאום עם העסק.', ar: 'بوكسات للضيافة وهدايا شخصية لصاحب المناسبة. مصلحة خيالية للعرض.', en: 'Host hampers and personalised gifts for the guest of honour. Fictional demo business.' },
    cities: ['נצרת', 'الناصرة', 'Nazareth'], phone: '0500000201', images: ['1549465220-1a8b9238cd48'],
    offerings: [
      { kind: 'product', title: { he: 'מארז תודה למארחים', ar: 'بوكس شكر للمضيفين', en: 'Thank-you host hamper' }, model: 'starting_from', amount: 120 },
      { kind: 'product', title: { he: 'מתנה אישית עם הקדשה', ar: 'هدية شخصية مع إهداء', en: 'Personalised keepsake' }, model: 'starting_from', amount: 85 },
    ],
  },
  {
    category: 'gifts', name: { he: 'זר וסיפור — דמו', ar: 'وردة وحكاية — تجريبي', en: 'Bloom & Story — Demo' },
    description: { he: 'זרי פרחים ומארזי מתנה למארחים, לימי הולדת ולאירועים. עסק דמיוני להדגמה.', ar: 'باقات ورد وهدايا للمضيفين وأعياد الميلاد. مصلحة خيالية للعرض.', en: 'Flowers and gift sets for hosts, birthdays and celebrations. Fictional demo business.' },
    cities: ['חיפה', 'حيفا', 'Haifa'], phone: '0500000202', images: ['1519741497674-611481863552'],
    offerings: [
      { kind: 'product', title: { he: 'זר פרחים חגיגי', ar: 'باقة ورد للمناسبة', en: 'Celebration bouquet' }, model: 'starting_from', amount: 150 },
      { kind: 'product', title: { he: 'מארז פרחים ושוקולד', ar: 'بوكس ورد وشوكولاتة', en: 'Flowers & chocolate gift set' }, model: 'starting_from', amount: 220 },
    ],
  },
];
