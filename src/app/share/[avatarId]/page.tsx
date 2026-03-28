'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SharedAvatar {
  id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  created_at: string;
}

export default function SharePage() {
  const params = useParams();
  const avatarId = params.avatarId as string;
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');

  const [avatar, setAvatar] = useState<SharedAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await fetch(`/api/share/${avatarId}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setAvatar(data.avatar);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (avatarId) {
      fetchAvatar();
    }
  }, [avatarId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 flex items-center justify-center">
        <div className="text-stone-400">{tc('loading')}</div>
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-stone-300 dark:text-stone-500" />
        </div>
        <h1 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
          {t('notFound')}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-violet-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Link>
      </div>
    );
  }

  const getRelationshipLabel = (relationship: string) => {
    try {
      return td(`relationships.${relationship}`);
    } catch {
      return relationship;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Heart className="w-6 h-6 text-violet-500" />
          {tc('appName')}
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-xl overflow-hidden border border-stone-100 dark:border-stone-700">
            <div className="h-48 bg-gradient-to-br from-violet-100 to-stone-100 dark:from-violet-900/30 dark:to-stone-800 flex items-center justify-center relative">
              {avatar.photo_url ? (
                <img
                  src={avatar.photo_url}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-white/80 dark:bg-stone-700 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-10 h-10 text-violet-400" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-stone-800 to-transparent" />
            </div>

            <div className="px-6 pb-6 -mt-4 relative">
              <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">
                {avatar.name}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 mb-4">
                {getRelationshipLabel(avatar.relationship)}
              </p>

              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 mb-6">
                <p className="text-violet-600 dark:text-violet-300 text-center text-sm">
                  {t('pageSubtitle')}
                </p>
              </div>

              <Link
                href="/create"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors"
              >
                <Heart className="w-5 h-5" />
                {t('createYours')}
              </Link>
            </div>
          </div>

          <p className="text-center text-stone-400 text-sm mt-6">
            {tc('appName')} — {tc('appDescription').slice(0, 20)}...
          </p>
        </div>
      </main>
    </div>
  );
}
