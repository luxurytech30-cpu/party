import { img } from './img';

const CATEGORY_PHOTOS: Record<string, string> = {
  venues: '1519167758481-83f550bb49b3',
  photography: '1452780212940-6f5c0d14d848',
  music: '1470229722913-7c0e2dbbafd3',
  decoration: '1511795409834-ef04bbd61622',
  catering: '1555244162-803834f70033',
  'cakes-sweets': '1464305795204-6f5bbfc7fb81',
  cars: '1492144534655-ae79c964c9d7',
  fashion: '1595777457583-95e059d581b8',
  makeup: '1487412947147-5cebf100ffc2',
  equipment: '1507504031003-b417219a0fde',
  'lighting-sound': '1506157786151-b8491531f063',
  gifts: '1549465220-1a8b9238cd48',
  entertainment: '1530103862676-de8c9debad1d',
  workshops: '1513364776144-60967b0f800f',
  'party-favors': '1549465220-1a8b9238cd48',
  attractions: '1513889961551-628c1e5e2ee9',
};
const EVENT_PHOTOS: Record<string, string> = {
  wedding: '1519741497674-611481863552', engagement: '1515934751635-c81c6bc9a2d8',
  henna: '1478146059778-26028b07395a', birthday: '1530103862676-de8c9debad1d',
  graduation: '1492684223066-81342ee5ff30', corporate: '1511578314322-379afb476865', other: '1533174072545-7a4b6ad7a6c3',
};

export const categoryPhoto = (slug: string, width = 640) => img(`https://images.unsplash.com/photo-${CATEGORY_PHOTOS[slug] ?? CATEGORY_PHOTOS.decoration}`, width, Math.round(width * .65));
export const eventPhoto = (type: string, width = 100) => img(`https://images.unsplash.com/photo-${EVENT_PHOTOS[type] ?? EVENT_PHOTOS.other}`, width, width);
