'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Heart, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import AvatarCard from '@/components/avatar/AvatarCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ProactivePanel from '@/components/dashboard/ProactivePanel';

interface Avatar {
  id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  character_card: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_conversation: string | null;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchAvatars = async () => {
    try {
      const res = await fetch('/api/avatars');
      const data = await res.json();
      setAvatars(data.avatars || []);
    } catch {
      console.error('Failed to fetch avatars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/avatars?avatarId=${deleteTarget}`, { method: 'DELETE' });
    setDeleteTarget(null);
    setAvatars((prev) => prev.filter((a) => a.id !== deleteTarget));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航 */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-violet-500" />
          <Link href="/" className="text-lg font-semibold">{tc('appName')}</Link>
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
            href="/create"
            className="px-4 py-2 bg-violet-500 text-white rounded-full text-sm hover:bg-violet-600 transition-colors"
          >
            {t('createNew')}
          </Link>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

        <ProactivePanel />

        {loading ? (
          <div className="text-center py-16 text-stone-400">{tc('loading')}</div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-violet-300" />
            </div>
            <h2 className="text-lg font-semibold text-stone-600 mb-2">{t('emptyTitle')}</h2>
            <p className="text-sm text-stone-400 mb-6">{t('emptyDesc')}</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('createFirst')}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {avatars.map((avatar) => (
              <AvatarCard
                key={avatar.id}
                id={avatar.id}
                name={avatar.name}
                relationship={avatar.relationship}
                photo_url={avatar.photo_url}
                last_conversation={avatar.last_conversation}
                onDelete={setDeleteTarget}
              />
            ))}
            <Link
              href="/create"
              className="flex flex-col items-center justify-center min-h-[240px] border-2 border-dashed border-stone-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50/30 transition-all cursor-pointer"
            >
              <Plus className="w-8 h-8 text-stone-300 mb-2" />
              <span className="text-sm text-stone-400">{t('createNew')}</span>
            </Link>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
