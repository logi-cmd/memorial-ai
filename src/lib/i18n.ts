export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: '中文',
  en: 'EN',
};

export function getOtherLocale(current: string): Locale {
  return current === 'zh' ? 'en' : 'zh';
}
