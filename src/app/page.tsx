'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Mic, Shield, ArrowRight, Sparkles, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('home');
  const tc = useTranslations('common');

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-violet-500" />
          <span className="text-lg font-semibold">{tc('appName')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/settings"
            className="p-2 text-stone-400 hover:text-violet-600 transition-colors"
            title={tc('settings') || '设置'}
          >
            <Settings className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm text-stone-600 hover:text-violet-600 transition-colors"
          >
            {t('viewAvatars')}
          </Link>
          <Link
            href="/create"
            className="px-4 py-2 bg-violet-500 text-white rounded-full text-sm hover:bg-violet-600 transition-colors"
          >
            {t('createAvatar')}
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-sm">
            <Sparkles className="w-4 h-4" />
            {t('subtitle')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            {t('title').split('，')[0]}，
            <br />
            <span className="text-violet-500">{t('title').split('，')[1]}</span>
          </h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
            {t('heroDescription')}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/create"
              className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 transition-colors font-medium"
            >
              {t('createAvatar')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 w-full mb-16">
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-semibold mb-2">{t('features.memory')}</h3>
            <p className="text-sm text-stone-500">
              {t('features.memoryDesc')}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
              <Mic className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-semibold mb-2">{t('features.voice')}</h3>
            <p className="text-sm text-stone-500">
              {t('features.voiceDesc')}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-violet-500" />
            </div>
            <h3 className="font-semibold mb-2">{t('features.style')}</h3>
            <p className="text-sm text-stone-500">
              {t('features.styleDesc')}
            </p>
          </div>
        </div>

        <div className="text-center space-y-8 mb-16 w-full">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            <StepCard number={1} title={t('steps.1')} desc={t('keywordsLabel', { name: '' })} />
            <ArrowRight className="w-4 h-4 text-stone-300 rotate-90 md:rotate-0 hidden md:block" />
            <StepCard number={2} title={t('steps.2')} desc={t('photoDesc')} />
            <ArrowRight className="w-4 h-4 text-stone-300 rotate-90 md:rotate-0 hidden md:block" />
            <StepCard number={3} title={t('steps.3')} desc={t('audioDesc')} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm w-full mb-16">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-violet-500 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">🔒 Privacy & Security</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                All data is encrypted and stored securely. This is not &quot;resurrection&quot; — it&apos;s a warm space to carry memories.
                AI will always be transparent about being a memory-based projection, and will gently suggest reaching out to people around you
                if conversations involve extreme emotions.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-stone-400 border-t border-stone-100">
        <p>{tc('appName')} — Open Source & Privacy First</p>
        <p className="mt-1">AI-generated content, for memorial and family connection purposes</p>
      </footer>
    </div>
  );
}

function StepCard({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm text-center w-full max-w-xs">
      <div className="w-8 h-8 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-stone-500">{desc}</p>
    </div>
  );
}
