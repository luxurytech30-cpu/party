/**
 * DEMO DATA — fictional businesses for development and demos only.
 * Every business created from this file is flagged `demo: true` and can be
 * removed with `npm run seed:demo -- --remove`. Photos are hotlinked from Unsplash
 * (free to use under the Unsplash License).
 */
type L = { ar: string; he: string; en: string };
type Kind = 'service' | 'package' | 'product';
type Model = 'fixed' | 'starting_from' | 'range' | 'hourly' | 'per_person' | 'package' | 'quote_only';

export interface DemoOffering {
  kind: Kind;
  title: L;
  model: Model;
  amount?: number;
  min?: number;
  max?: number;
  negotiable?: boolean;
  includes?: string[];
}
export interface DemoBusiness {
  category: string;
  name: L;
  description: L;
  cities: string[];
  phone: string;
  images: string[]; // Unsplash photo ids
  offerings: DemoOffering[];
  featured?: boolean;
}

export const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

const IMG = {
  table2: '1464366400600-7168b8af9bc3', // tent tables
  hall1: '1519225421980-715cb0215aed', // long outdoor wedding tables
  hall2: '1519167758481-83f550bb49b3', // chandelier ballroom
  hall3: '1511578314322-379afb476865', // modern banquet hall
  garden1: '1469371670807-013ccf25f16a', // outdoor ceremony aisle
  garden2: '1523438885200-e635ba2c371e', // garden gazebo
  tent: '1502635385003-ee1e6a1a742d', // white tent banquet
  table: '1511795409834-ef04bbd61622', // table setting flowers
  dinner: '1527529482837-4698179dc6ce', // guests toasting at dinner
  bride1: '1519741497674-611481863552',
  couple1: '1537633552985-df8429e8048b', // bride & groom on beach
  couple2: '1532712938310-34cb3982ef74',
  couple3: '1544078751-58fee2d8a03b',
  hands: '1520854221256-17451cc331bf',
  rings: '1465495976277-4387d4b0b4c6',
  camera: '1516035069371-29a1b244cc32',
  dj: '1470225620780-dba8ba36b745',
  singer: '1493225457124-a3eb161ffa5f',
  stage: '1514525253161-7a46d19cd819',
  crowd1: '1429962714451-bb934ecdc4ec',
  crowd2: '1501281668745-f7f57925c3b4',
  crowd3: '1516450360452-9312f5e86fc7',
  confetti: '1492684223066-81342ee5ff30',
  confetti2: '1533174072545-7a4b6ad7a6c3',
  buffet: '1555244162-803834f70033',
  plated: '1414235077428-338989a2e8c0',
  food: '1504674900247-0877df9cc836',
  chefs: '1556910103-1c02745aae4d',
  cakeFlowers: '1535254973040-607b474cb50d',
  cakeChoc: '1578985545062-69928b1d9587',
  cakePink: '1562440499-64c9a111f713',
  cakeSlice: '1571115177098-24ec42ed204d',
  birthdayBoard: '1558636508-e0db3814bd1d', // happy birthday board
  balloons: '1530103862676-de8c9debad1d',
  decorTable: '1478146059778-26028b07395a', // decorated table, brick wall
  flowers1: '1487530811176-3780de880c2d', // flower arrangement
  bouquet: '1525258946800-98cfd641d0de', // rose bouquet
  sign: '1507504031003-b417219a0fde', // Mr & Mrs sign
  carWhite: '1492144534655-ae79c964c9d7',
  carBlack: '1503376780353-7e6692767b70',
  carMustang: '1494976388531-d1058494cdd8',
  ringsRoses: '1515934751635-c81c6bc9a2d8',
  dress: '1594552072238-b8a33785b261',
  dressField: '1478146896981-b80fe463b330', // woman in dress
  makeup1: '1487412947147-5cebf100ffc2',
  makeup2: '1522335789203-aabd1fc54bc9',
  gift1: '1549465220-1a8b9238cd48',
  gift2: '1513885535751-8b9238bd345a',
  conference: '1540575467063-178a50c2df87',
  goldRings: '1606800052052-a08af7148866', // gold rings
};

const svc = (title: L, model: Model, amount: number, extra: Partial<DemoOffering> = {}): DemoOffering => ({ kind: 'service', title, model, amount, ...extra });
const pkg = (title: L, amount: number, includes: string[]): DemoOffering => ({ kind: 'package', title, model: 'package', amount, includes });
const prod = (title: L, model: Model, amount: number): DemoOffering => ({ kind: 'product', title, model, amount });

export const DEMO_BUSINESSES: DemoBusiness[] = [
  // ---------- Venues ----------
  {
    category: 'venues',
    featured: true,
    name: { ar: 'قصر الياسمين', he: 'ארמון היסמין', en: 'Jasmine Palace' },
    description: {
      ar: 'قاعة فاخرة بثريات كريستال تتسع حتى 900 ضيف، مع موقف واسع وإضاءة مسرحية كاملة.',
      he: 'אולם יוקרה עם נברשות קריסטל לעד 900 אורחים, חניה רחבה ותאורת במה מלאה.',
      en: 'A luxury hall with crystal chandeliers for up to 900 guests, large parking and full stage lighting.',
    },
    cities: ['سخنين', 'عرابة'],
    phone: '0501234501',
    images: [IMG.hall2, IMG.hall1, IMG.dinner, IMG.table],
    offerings: [
      svc({ ar: 'حفلة عرس كاملة', he: 'חתונה מלאה', en: 'Full wedding evening' }, 'per_person', 180, { negotiable: true }),
      pkg({ ar: 'باقة ملكية', he: 'חבילה מלכותית', en: 'Royal package' }, 95000, ['قاعة + ضيافة 500 ضيف', 'زينة كوشة', 'إضاءة وصوت', 'منسّق حفل']),
    ],
  },
  {
    category: 'venues',
    featured: true,
    name: { ar: 'حدائق الزيتون', he: 'גני הזית', en: 'Olive Gardens' },
    description: {
      ar: 'حديقة مفتوحة بين أشجار الزيتون مع ممر عرس وإطلالة ساحرة على السهل.',
      he: 'גן פתוח בין עצי זית עם שביל טקס ונוף קסום לעמק.',
      en: 'An open-air garden among olive trees with a ceremony aisle and a magical valley view.',
    },
    cities: ['الناصرة'],
    phone: '0501234502',
    images: [IMG.garden1, IMG.garden2, IMG.hall1, IMG.couple2],
    offerings: [
      svc({ ar: 'استئجار الحديقة', he: 'השכרת הגן', en: 'Garden rental' }, 'starting_from', 18000),
      svc({ ar: 'عشاء في الحديقة', he: 'ארוחת ערב בגן', en: 'Garden dinner' }, 'per_person', 150),
    ],
  },
  {
    category: 'venues',
    name: { ar: 'قاعة النجوم', he: 'אולם הכוכבים', en: 'Stars Hall' },
    description: {
      ar: 'قاعة عصرية بتصميم أنيق، مناسبة للأعراس والخطوبات وحفلات التخرج.',
      he: 'אולם מודרני ומעוצב, מתאים לחתונות, אירוסין ומסיבות סיום.',
      en: 'A modern, elegant hall for weddings, engagements and graduations.',
    },
    cities: ['حيفا'],
    phone: '0501234503',
    images: [IMG.hall3, IMG.hall1, IMG.confetti2],
    offerings: [svc({ ar: 'حفلة مسائية', he: 'אירוע ערב', en: 'Evening event' }, 'per_person', 160, { negotiable: true })],
  },
  {
    category: 'venues',
    name: { ar: 'قاعة الأندلس', he: 'אולם אנדלוסיה', en: 'Andalus Hall' },
    description: {
      ar: 'أجواء أندلسية دافئة، مطبخ داخلي وخدمة شخصية من الاستقبال حتى الختام.',
      he: 'אווירה אנדלוסית חמה, מטבח פנימי ושירות אישי מקבלת הפנים ועד הסוף.',
      en: 'Warm Andalusian atmosphere, in-house kitchen and personal service from start to finish.',
    },
    cities: ['عرابة', 'سخنين'],
    phone: '0501234504',
    images: [IMG.table, IMG.tent, IMG.hall2],
    offerings: [svc({ ar: 'حفلة كاملة', he: 'אירוע מלא', en: 'Full event' }, 'per_person', 140)],
  },
  // ---------- Photography ----------
  {
    category: 'photography',
    featured: true,
    name: { ar: 'استوديو لوميير', he: 'סטודיו לומייר', en: 'Lumière Studio' },
    description: {
      ar: 'تصوير أعراس سينمائي، ألبومات فاخرة وفيديو بطائرة درون.',
      he: 'צילום חתונות קולנועי, אלבומי יוקרה ווידאו ברחפן.',
      en: 'Cinematic wedding photography, luxury albums and drone video.',
    },
    cities: ['الناصرة', 'حيفا'],
    phone: '0501234505',
    images: [IMG.couple1, IMG.bride1, IMG.couple3, IMG.hands],
    offerings: [
      pkg({ ar: 'باقة ذهبية', he: 'חבילת זהב', en: 'Gold package' }, 7500, ['مصوّران', 'فيديو كامل', 'درون', 'ألبوم 40 صفحة']),
      svc({ ar: 'تصوير خطوبة', he: 'צילום אירוסין', en: 'Engagement shoot' }, 'starting_from', 2500),
    ],
  },
  {
    category: 'photography',
    name: { ar: 'عدسة الفرح', he: 'עדשת השמחה', en: 'Joy Lens' },
    description: {
      ar: 'نلتقط اللحظات العفوية بأسلوب طبيعي ودافئ.',
      he: 'מנציחים רגעים ספונטניים בסגנון טבעי וחם.',
      en: 'Candid moments captured in a natural, warm style.',
    },
    cities: ['حيفا', 'شفاعمرو'],
    phone: '0501234506',
    images: [IMG.couple2, IMG.camera, IMG.rings],
    offerings: [svc({ ar: 'تصوير عرس', he: 'צילום חתונה', en: 'Wedding photography' }, 'range', 0, { min: 3500, max: 6000 })],
  },
  {
    category: 'photography',
    name: { ar: 'ستوديو ضوء', he: 'סטודיו אור', en: 'Daw Studio' },
    description: {
      ar: 'تصوير فوتوغرافي وفيديو للمناسبات مع تسليم سريع خلال أسبوعين.',
      he: 'צילום ווידאו לאירועים עם מסירה מהירה תוך שבועיים.',
      en: 'Event photo & video with fast two-week delivery.',
    },
    cities: ['سخنين'],
    phone: '0501234507',
    images: [IMG.couple3, IMG.camera, IMG.hands],
    offerings: [svc({ ar: 'ساعة تصوير', he: 'שעת צילום', en: 'Photography hour' }, 'hourly', 450)],
  },
  // ---------- Music ----------
  {
    category: 'music',
    featured: true,
    name: { ar: 'دي جي بيت', he: 'DJ ביט', en: 'DJ Beat' },
    description: {
      ar: 'دي جي محترف مع نظام صوت وإضاءة ليزر ودخان، أغاني عربية وعالمية.',
      he: 'די ג׳יי מקצועי עם הגברה, לייזרים ועשן — מוזיקה ערבית ובינלאומית.',
      en: 'Pro DJ with sound, lasers and haze — Arabic and international hits.',
    },
    cities: ['الناصرة', 'حيفا'],
    phone: '0501234508',
    images: [IMG.dj, IMG.crowd1, IMG.confetti],
    offerings: [svc({ ar: 'سهرة كاملة', he: 'ערב מלא', en: 'Full night' }, 'starting_from', 2500, { negotiable: true })],
  },
  {
    category: 'music',
    name: { ar: 'فرقة الأصيل', he: 'להקת אל-אסיל', en: 'Al-Aseel Band' },
    description: {
      ar: 'فرقة حيّة مع مطرب وطبل وزفة تقليدية.',
      he: 'להקה חיה עם זמר, תופים וזפה מסורתית.',
      en: 'Live band with singer, drums and a traditional zaffa.',
    },
    cities: ['شفاعمرو', 'عرابة'],
    phone: '0501234509',
    images: [IMG.singer, IMG.stage, IMG.crowd2],
    offerings: [
      svc({ ar: 'سهرة مع مطرب', he: 'ערב עם זמר', en: 'Night with singer' }, 'starting_from', 6000),
      svc({ ar: 'زفة تقليدية', he: 'זפה מסורתית', en: 'Traditional zaffa' }, 'fixed', 1800),
    ],
  },
  {
    category: 'music',
    name: { ar: 'نغم للحفلات', he: 'נע׳ם אירועים', en: 'Nagham Events' },
    description: {
      ar: 'موسيقى لحفلات الحنّة والخطوبة وأعياد الميلاد.',
      he: 'מוזיקה לחינות, אירוסין וימי הולדת.',
      en: 'Music for henna nights, engagements and birthdays.',
    },
    cities: ['سخنين'],
    phone: '0501234510',
    images: [IMG.crowd3, IMG.dj],
    offerings: [svc({ ar: 'حفلة حنّة', he: 'ערב חינה', en: 'Henna night' }, 'fixed', 2000)],
  },
  // ---------- Decoration ----------
  {
    category: 'decoration',
    featured: true,
    name: { ar: 'ورد وزينة', he: 'פרחים ועיצוב', en: 'Ward Decor' },
    description: {
      ar: 'تنسيق كوشة وطاولات بالورد الطبيعي، تصميم خاص لكل مناسبة.',
      he: 'עיצוב בימה ושולחנות בפרחים טבעיים, עיצוב אישי לכל אירוע.',
      en: 'Stage and table styling with fresh flowers, custom for every event.',
    },
    cities: ['الناصرة', 'حيفا'],
    phone: '0501234511',
    images: [IMG.flowers1, IMG.decorTable, IMG.bouquet, IMG.table],
    offerings: [
      pkg({ ar: 'كوشة + طاولات', he: 'בימה + שולחנות', en: 'Stage + tables' }, 8500, ['كوشة بالورد', '40 طاولة', 'ممر عرس']),
      svc({ ar: 'باقة عروس', he: 'זר כלה', en: 'Bridal bouquet' }, 'fixed', 450),
    ],
  },
  {
    category: 'decoration',
    name: { ar: 'بالونات الفرح', he: 'בלוני השמחה', en: 'Joy Balloons' },
    description: {
      ar: 'زينة بالونات لأعياد الميلاد والاستقبالات وحفلات الأطفال.',
      he: 'עיצוב בלונים לימי הולדת, קבלות פנים ומסיבות ילדים.',
      en: 'Balloon decor for birthdays, receptions and kids parties.',
    },
    cities: ['شفاعمرو', 'حيفا'],
    phone: '0501234512',
    images: [IMG.balloons, IMG.birthdayBoard, IMG.sign],
    offerings: [svc({ ar: 'قوس بالونات', he: 'קשת בלונים', en: 'Balloon arch' }, 'starting_from', 650)],
  },
  // ---------- Catering ----------
  {
    category: 'catering',
    featured: true,
    name: { ar: 'مطبخ المذاق', he: 'מטבח הטעם', en: 'Al-Mathaq Kitchen' },
    description: {
      ar: 'ضيافة وبوفيه شرقي وغربي، مناسف ومشاوي مع طاقم خدمة.',
      he: 'קייטרינג ובופה מזרחי ומערבי, מנסף ומנגל עם צוות מלצרים.',
      en: 'Oriental & western buffet, mansaf and grills with full serving staff.',
    },
    cities: ['الناصرة', 'سخنين'],
    phone: '0501234513',
    images: [IMG.buffet, IMG.plated, IMG.food, IMG.chefs],
    offerings: [
      svc({ ar: 'بوفيه شرقي', he: 'בופה מזרחי', en: 'Oriental buffet' }, 'per_person', 85),
      svc({ ar: 'عشاء مقدّم', he: 'ארוחה מוגשת', en: 'Plated dinner' }, 'per_person', 120, { negotiable: true }),
    ],
  },
  {
    category: 'catering',
    name: { ar: 'بوفيه ليالي', he: 'בופה לילות', en: 'Layali Buffet' },
    description: {
      ar: 'بوفيه فاخر مع ركن قهوة وكنافة ساخنة.',
      he: 'בופה יוקרתי עם עמדת קפה וכנאפה חמה.',
      en: 'Premium buffet with a coffee corner and hot knafeh.',
    },
    cities: ['عرابة', 'شفاعمرو'],
    phone: '0501234514',
    images: [IMG.food, IMG.buffet, IMG.dinner],
    offerings: [svc({ ar: 'بوفيه كامل', he: 'בופה מלא', en: 'Full buffet' }, 'per_person', 95)],
  },
  // ---------- Cakes & sweets ----------
  {
    category: 'cakes-sweets',
    featured: true,
    name: { ar: 'حلويات سكّر ونبات', he: 'סוכר ונבאת', en: 'Sukkar w Nabat' },
    description: {
      ar: 'كيك أعراس بطبقات وورد سكّر، تصميم حسب الطلب.',
      he: 'עוגות חתונה בקומות ופרחי סוכר, בעיצוב אישי.',
      en: 'Tiered wedding cakes with sugar flowers, custom designs.',
    },
    cities: ['حيفا', 'الناصرة'],
    phone: '0501234515',
    images: [IMG.cakeFlowers, IMG.cakePink, IMG.cakeSlice],
    offerings: [
      prod({ ar: 'كيك عرس 3 طبقات', he: 'עוגת חתונה 3 קומות', en: '3-tier wedding cake' }, 'starting_from', 1200),
      prod({ ar: 'كيك عيد ميلاد', he: 'עוגת יום הולדת', en: 'Birthday cake' }, 'starting_from', 280),
    ],
  },
  {
    category: 'cakes-sweets',
    name: { ar: 'كنافة الشمال', he: 'כנאפה הצפון', en: 'Northern Knafeh' },
    description: {
      ar: 'كنافة نابلسية ساخنة في موقع الحفلة وحلويات شرقية.',
      he: 'כנאפה שכמית חמה במקום האירוע ומתוקים מזרחיים.',
      en: 'Hot Nablusi knafeh on site plus oriental sweets.',
    },
    cities: ['الناصرة'],
    phone: '0501234516',
    images: [IMG.cakeChoc, IMG.cakeSlice, IMG.birthdayBoard],
    offerings: [prod({ ar: 'صدر كنافة', he: 'מגש כנאפה', en: 'Knafeh tray' }, 'fixed', 300)],
  },
  // ---------- Cars ----------
  {
    category: 'cars',
    featured: true,
    name: { ar: 'رويال كارز', he: 'רויאל קארס', en: 'Royal Cars' },
    description: {
      ar: 'سيارات أفراح فاخرة مع سائق وزينة ورد.',
      he: 'רכבי יוקרה לחתונה עם נהג וקישוט פרחים.',
      en: 'Luxury wedding cars with chauffeur and flower decoration.',
    },
    cities: ['شفاعمرو', 'حيفا'],
    phone: '0501234517',
    images: [IMG.carWhite, IMG.carBlack, IMG.carMustang],
    offerings: [
      prod({ ar: 'سيارة عروس مع سائق', he: 'רכב כלה עם נהג', en: 'Bridal car with driver' }, 'fixed', 1500),
      prod({ ar: 'موكب 3 سيارات', he: 'שיירת 3 רכבים', en: '3-car convoy' }, 'starting_from', 3800),
    ],
  },
  {
    category: 'cars',
    name: { ar: 'موستانغ للأفراح', he: 'מוסטנג לאירועים', en: 'Mustang Events' },
    description: {
      ar: 'سيارات رياضية كلاسيكية لجلسات التصوير والزفة.',
      he: 'רכבי ספורט קלאסיים לצילומים ולזפה.',
      en: 'Classic sports cars for photo sessions and the zaffa.',
    },
    cities: ['سخنين'],
    phone: '0501234518',
    images: [IMG.carMustang, IMG.carBlack],
    offerings: [prod({ ar: 'تأجير يومي', he: 'השכרה יומית', en: 'Daily rental' }, 'fixed', 1200)],
  },
  // ---------- Fashion ----------
  {
    category: 'fashion',
    featured: true,
    name: { ar: 'دار ليال للأزياء', he: 'בית האופנה ליאל', en: 'Layal Couture' },
    description: {
      ar: 'فساتين أعراس وسهرة للبيع والإيجار، وبدلات عريس.',
      he: 'שמלות כלה וערב למכירה ולהשכרה, וחליפות חתן.',
      en: 'Bridal and evening gowns to buy or rent, plus groom suits.',
    },
    cities: ['الناصرة', 'عرابة'],
    phone: '0501234519',
    images: [IMG.dress, IMG.dressField, IMG.bride1],
    offerings: [
      prod({ ar: 'إيجار فستان عرس', he: 'השכרת שמלת כלה', en: 'Bridal gown rental' }, 'starting_from', 2500),
      prod({ ar: 'بدلة عريس', he: 'חליפת חתן', en: 'Groom suit' }, 'starting_from', 1400),
    ],
  },
  // ---------- Makeup ----------
  {
    category: 'makeup',
    featured: true,
    name: { ar: 'غلو بيوتي', he: 'גלו ביוטי', en: 'Glow Beauty' },
    description: {
      ar: 'مكياج عرائس وتسريحات، تجربة مكياج قبل العرس.',
      he: 'איפור כלות ותסרוקות, כולל איפור ניסיון.',
      en: 'Bridal makeup & hair, including a trial session.',
    },
    cities: ['حيفا', 'شفاعمرو'],
    phone: '0501234520',
    images: [IMG.makeup1, IMG.makeup2],
    offerings: [
      pkg({ ar: 'باقة العروس', he: 'חבילת כלה', en: 'Bridal package' }, 2200, ['مكياج', 'تسريحة', 'تجربة مسبقة']),
      svc({ ar: 'مكياج سهرة', he: 'איפור ערב', en: 'Evening makeup' }, 'fixed', 350),
    ],
  },
  {
    category: 'makeup',
    name: { ar: 'صالون لمسة', he: 'סלון לַמְסָה', en: 'Lamsa Salon' },
    description: {
      ar: 'مكياج وحنّة للعروس وصديقاتها.',
      he: 'איפור וחינה לכלה ולחברות.',
      en: 'Makeup and henna for the bride and her friends.',
    },
    cities: ['سخنين'],
    phone: '0501234521',
    images: [IMG.makeup2, IMG.makeup1],
    offerings: [svc({ ar: 'مكياج للشخص', he: 'איפור לאדם', en: 'Makeup per person' }, 'per_person', 220)],
  },
  // ---------- Gifts ----------
  {
    category: 'gifts',
    name: { ar: 'هدايا ومستلزمات', he: 'מתנות ואביזרים', en: 'Hadaya Gifts' },
    description: {
      ar: 'توزيعات ضيوف مطبوعة بالأسماء وتغليف هدايا فاخر.',
      he: 'מזכרות לאורחים עם הדפסת שמות ואריזות מתנה יוקרתיות.',
      en: 'Personalised guest favors and luxury gift wrapping.',
    },
    cities: ['الناصرة', 'حيفا'],
    phone: '0501234522',
    images: [IMG.gift1, IMG.gift2, IMG.goldRings],
    offerings: [prod({ ar: 'توزيعات (للقطعة)', he: 'מזכרות (ליחידה)', en: 'Favors (per piece)' }, 'fixed', 12)],
  },
  // ---------- Equipment ----------
  {
    category: 'equipment',
    name: { ar: 'طاولة لتأجير المعدات', he: 'טאוולה השכרת ציוד', en: 'Tawleh Rentals' },
    description: {
      ar: 'تأجير طاولات وكراسي وأطقم صحون وكاسات مع توصيل وتركيب.',
      he: 'השכרת שולחנות, כיסאות, צלחות וכוסות כולל הובלה והרכבה.',
      en: 'Tables, chairs, plates and glassware with delivery and setup.',
    },
    cities: ['عرابة', 'سخنين', 'الناصرة'],
    phone: '0501234523',
    images: [IMG.hall1, IMG.table, IMG.garden1],
    offerings: [
      prod({ ar: 'كرسي (للقطعة)', he: 'כיסא (ליחידה)', en: 'Chair (each)' }, 'fixed', 8),
      prod({ ar: 'طاولة مستديرة', he: 'שולחן עגול', en: 'Round table' }, 'fixed', 45),
    ],
  },
  // ---------- Lighting & sound ----------
  {
    category: 'lighting-sound',
    name: { ar: 'ستيج برو', he: 'סטייג׳ פרו', en: 'Stage Pro' },
    description: {
      ar: 'إضاءة مسرحية، شاشات LED وأنظمة صوت للمناسبات الكبيرة.',
      he: 'תאורת במה, מסכי LED ומערכות הגברה לאירועים גדולים.',
      en: 'Stage lighting, LED screens and PA systems for large events.',
    },
    cities: ['حيفا'],
    phone: '0501234524',
    images: [IMG.stage, IMG.crowd2, IMG.conference],
    offerings: [svc({ ar: 'نظام صوت وإضاءة', he: 'מערכת הגברה ותאורה', en: 'Sound & light system' }, 'starting_from', 3200)],
  },
];
