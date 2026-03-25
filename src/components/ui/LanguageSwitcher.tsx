'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { getOtherLocale, LOCALE_LABELS } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = getOtherLocale(currentLocale);
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-1 px-2 py-1.5 text-sm text-stone-500 hover:text-violet-600 rounded-lg hover:bg-stone-50 transition-colors"
      title={LOCALE_LABELS[getOtherLocale(currentLocale)]}
    >
      <Globe className="w-4 h-4" />
      <span>{LOCALE_LABELS[getOtherLocale(currentLocale)]}</span>
    </button>
  );
}
