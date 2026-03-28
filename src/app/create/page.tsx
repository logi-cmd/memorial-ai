'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Image, Mic, ArrowRight, ArrowLeft, Loader2, MessageSquare, ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PersonalityQuestionnaire from '@/components/avatar/PersonalityQuestionnaire';
import type { QuestionnaireAnswer } from '@/lib/questionnaire';

const RELATIONSHIP_KEYS = [
  'father', 'mother', 'grandfather', 'grandmother',
  'maternalGrandfather', 'maternalGrandmother',
  'spouse', 'sibling', 'child', 'friend', 'other',
] as const;

export default function CreatePage() {
  const router = useRouter();
  const t = useTranslations('create');
  const tc = useTranslations('common');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [description, setDescription] = useState('');

  const [photo, setPhoto] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [chatText, setChatText] = useState('');
  const [calibrating, setCalibrating] = useState(false);
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null);

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && keywords.length < 10 && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const handleCreate = async () => {
    if (!name || !relationship || keywords.length < 3) return;
    setLoading(true);

    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          relationship,
          keywords,
          description,
        }),
      });

      const data = await res.json();
      if (data.avatar) {
        setCreatedAvatarId(data.avatar.id);
        setStep(4);
      }
    } catch (err) {
      console.error('Create error:', err);
      alert(tc('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalibrate = async () => {
    if (!createdAvatarId) return;

    if (chatText.length >= 50) {
      setCalibrating(true);
      try {
        await fetch('/api/profile/calibrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarId: createdAvatarId, chatHistory: chatText }),
        });
      } catch (err) {
        console.error('Calibrate error:', err);
      } finally {
        setCalibrating(false);
      }
    }

    router.push(`/chat/${createdAvatarId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {[
            { n: 1, label: t('steps.1'), icon: User },
            { n: 2, label: t('steps.5'), icon: ClipboardList },
            { n: 3, label: t('steps.2'), icon: Image },
            { n: 4, label: t('steps.3'), icon: Mic },
            { n: 5, label: t('steps.4'), icon: MessageSquare },
          ].map(({ n, label, icon: Icon }) => (
            <button
              key={n}
              onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                step === n
                  ? 'bg-violet-500 text-white'
                  : step > n
                  ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                  : 'bg-stone-100 text-stone-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold mb-1">{t('nameLabel')}</h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold mb-1">{t('relationshipLabel')}</h2>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setRelationship(key)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      relationship === key
                        ? 'bg-violet-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {t(`relationships.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-1">
                {t('keywordsLabel', { name: name || 'TA' })}
              </h2>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder={t('keywordPlaceholder')}
                  className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
                >
                  {t('addKeyword')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-sm"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-violet-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-1">{t('descriptionLabel')}</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name || !relationship || keywords.length < 3}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {tc('next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Questionnaire */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <PersonalityQuestionnaire
              onSubmit={async (answers: QuestionnaireAnswer[]) => {
                if (createdAvatarId) {
                  try {
                    await fetch('/api/create/questionnaire', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ avatarId: createdAvatarId, answers, name, relationship, keywords, description }),
                    });
                  } catch (err) {
                    console.error('Questionnaire submit error:', err);
                  }
                }
                setStep(3);
              }}
              onSkip={() => setStep(3)}
            />
          </div>
        )}

        {/* Step 3: Photo */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold">{t('photoTitle', { name })}</h2>
            <p className="text-stone-500 text-sm">
              {t('photoDesc')}
            </p>

            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all">
              {photo ? (
                <img
                  src={photo}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <>
                  <Image className="w-10 h-10 text-stone-300 mb-2" />
                  <span className="text-sm text-stone-400">{t('clickUpload')}</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)} // → 问卷
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-stone-200 rounded-xl hover:bg-stone-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {tc('back')}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600"
              >
                {tc('next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Voice (Optional) */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold">{t('audioTitle', { name })}</h2>
            <p className="text-stone-500 text-sm">
              {t('audioDesc')}
            </p>

            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all">
              <Mic className="w-10 h-10 text-stone-300 mb-2" />
              {audioFile ? (
                <span className="text-sm text-violet-600">{audioFile.name}</span>
              ) : (
                <span className="text-sm text-stone-400">{t('clickUploadAudio')}</span>
              )}
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />
            </label>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-stone-200 rounded-xl hover:bg-stone-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {tc('back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    {tc('next')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Chat History Calibration (Optional) */}
        {step === 5 && createdAvatarId && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold">{t('calibrateTitle')}</h2>
            <p className="text-stone-500 text-sm">
              {t('calibrateDesc', { name })}
              <br />
              <span className="text-violet-600">{t('calibrateHighlight')}</span>
            </p>

            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={t('calibratePlaceholder')}
              rows={8}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm"
              disabled={calibrating}
            />

            <p className="text-xs text-stone-400">
              {t('charCount', { count: chatText.length })}
            </p>

            {calibrating && (
              <div className="flex items-center gap-2 text-violet-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('analyzing')}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-stone-200 rounded-xl hover:bg-stone-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {tc('back')}
              </button>
              <button
                onClick={handleCalibrate}
                disabled={calibrating || chatText.length < 50}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-60 transition-all"
              >
                {calibrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('analyzingShort')}
                  </>
                ) : chatText.length >= 50 ? (
                  t('calibrateAndChat')
                ) : (
                  t('skipAndChat')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
