'use client';

import { EVENT_TYPES, type EventType } from '@party/shared';
import { img } from '@/lib/img';
import { useI18n } from '@/lib/providers';

const scenes: Record<EventType, string> = {
  wedding: '1519741497674-611481863552',
  engagement: '1515934751635-c81c6bc9a2d8',
  henna: '1478146059778-26028b07395a',
  birthday: '1530103862676-de8c9debad1d',
  graduation: '1492684223066-81342ee5ff30',
  corporate: '1511578314322-379afb476865',
  other: '1533174072545-7a4b6ad7a6c3',
};

export function PartyPicker({ value, onChange }: { value: EventType | null; onChange: (t: EventType) => void }) {
  const { t } = useI18n();
  return (
    <div className="occasion-gallery">
      {EVENT_TYPES.map((type, index) => (
        <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)} className={`occasion-scene occasion-scene-${type}`}>
          <img src={img(`https://images.unsplash.com/photo-${scenes[type]}`, 450, 650)} alt="" loading="lazy" />
          <span className="occasion-scene-shade" />
          <span className="occasion-scene-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="occasion-scene-label">{t.ev.types[type]}<span aria-hidden="true">{value === type ? '\u2713' : '\u2197'}</span></span>
        </button>
      ))}
    </div>
  );
}
