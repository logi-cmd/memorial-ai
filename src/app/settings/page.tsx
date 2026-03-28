'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [llmProvider, setLlmProvider] = useState('ollama');
  const [embeddingProvider, setEmbeddingProvider] = useState('local');
  const [ttsProvider, setTtsProvider] = useState('edge-tts');

  const handleSave = async () => {
    const config = { mode, llm: { provider: llmProvider }, embedding: { provider: embeddingProvider }, tts: { provider: ttsProvider } };
    localStorage.setItem('memorial-ai-config', JSON.stringify(config));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-violet-500" />
          <span className="text-lg font-semibold">{tc('appName')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/dashboard" className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:text-violet-600">
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8 text-stone-900 dark:text-stone-100">{t('title')}</h1>

        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
            <h2 className="font-semibold mb-4 text-stone-900 dark:text-stone-100">{t('mode')}</h2>
            <div className="flex gap-3">
              <button onClick={() => setMode('local')} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${mode === 'local' ? 'bg-violet-500 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                {t('localMode')}
              </button>
              <button onClick={() => setMode('cloud')} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${mode === 'cloud' ? 'bg-violet-500 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                {t('cloudMode')}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">{t('modeHint')}</p>
          </div>

          <div className="bg-white dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
            <h2 className="font-semibold mb-4 text-stone-900 dark:text-stone-100">{t('llmTitle')}</h2>
            <select value={llmProvider} onChange={e => setLlmProvider(e.target.value)} className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100">
              <option value="ollama">Ollama (本地)</option>
              <option value="anthropic">Anthropic Claude (云端)</option>
            </select>
            {llmProvider === 'ollama' && (
              <div className="mt-3 space-y-2">
                <label className="text-sm text-stone-600 dark:text-stone-400">{t('ollamaModel')}</label>
                <input type="text" placeholder="qwen2.5:7b" className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
                <label className="text-sm text-stone-600 dark:text-stone-400">{t('ollamaUrl')}</label>
                <input type="text" placeholder="http://localhost:11434" className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
            <h2 className="font-semibold mb-4 text-stone-900 dark:text-stone-100">{t('embeddingTitle')}</h2>
            <select value={embeddingProvider} onChange={e => setEmbeddingProvider(e.target.value)} className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100">
              <option value="local">本地嵌入 (@xenova/transformers)</option>
              <option value="openai">OpenAI Embeddings (云端)</option>
            </select>
          </div>

          <div className="bg-white dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
            <h2 className="font-semibold mb-4 text-stone-900 dark:text-stone-100">{t('ttsTitle')}</h2>
            <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value)} className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100">
              <option value="edge-tts">Edge-TTS (免费)</option>
              <option value="elevenlabs">ElevenLabs (云端)</option>
            </select>
          </div>

          <button onClick={handleSave} className="w-full py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {t('save')}
          </button>
        </div>
      </main>
    </div>
  );
}
