'use client';

import { useTranslations } from 'next-intl';

interface MemoryFilterProps {
  active: string;
  onChange: (type: string) => void;
}

export default function MemoryFilter({ active, onChange }: MemoryFilterProps) {
  const t = useTranslations('timeline');

  const types = [
    { key: 'all', label: t('filterAll') },
    { key: 'pending', label: t('filterPending') },
    { key: 'core_identity', label: t('types.core_identity') },
    { key: 'personality', label: t('types.personality') },
    { key: 'life_event', label: t('types.life_event') },
    { key: 'relationship', label: t('types.relationship') },
    { key: 'habit', label: t('types.habit') },
    { key: 'conversation', label: t('types.conversation') },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            active === key
              ? 'bg-violet-500 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
