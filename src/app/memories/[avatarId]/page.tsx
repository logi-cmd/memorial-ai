'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Brain } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import MemoryTimeline from '@/components/memory/MemoryTimeline';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function MemoriesPage() {
  const params = useParams();
  const avatarId = params.avatarId as string;
  const t = useTranslations('timeline');

  const [avatarName, setAvatarName] = useState('');

  useEffect(() => {
    fetch(`/api/create?avatarId=${avatarId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.avatar) setAvatarName(data.avatar.name);
      })
      .catch(() => {});
  }, [avatarId]);

  const handleMemoryConfirm = (_memoryId: string) => {};

  const handleMemoryDelete = (_memoryId: string) => {};

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-stone-400 hover:text-stone-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" />
            <span className="font-semibold">{avatarName}</span>
            <span className="text-sm text-stone-400">/ {t('title')}</span>
          </div>
        </div>
        <LanguageSwitcher />
      </nav>

      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full">
        <MemoryTimeline
          avatarId={avatarId}
          onMemoryConfirm={handleMemoryConfirm}
          onMemoryDelete={handleMemoryDelete}
        />
      </main>
    </div>
  );
}
