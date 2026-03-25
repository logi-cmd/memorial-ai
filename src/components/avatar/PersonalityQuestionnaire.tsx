'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QUESTIONS, QUESTIONNAIRE_CATEGORIES, type QuestionnaireAnswer } from '@/lib/questionnaire';

interface PersonalityQuestionnaireProps {
  onSubmit: (answers: QuestionnaireAnswer[]) => void;
  onSkip: () => void;
}

export default function PersonalityQuestionnaire({ onSubmit, onSkip }: PersonalityQuestionnaireProps) {
  const t = useTranslations('questionnaire');
  const [currentCategoryIdx, setCurrentCategoryIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentCategory = QUESTIONNAIRE_CATEGORIES[currentCategoryIdx];
  const categoryQuestions = QUESTIONS.filter((q) => q.category === currentCategory);
  const totalCategories = QUESTIONNAIRE_CATEGORIES.length;
  const progress = ((currentCategoryIdx + 1) / totalCategories) * 100;

  const handleNext = () => {
    if (currentCategoryIdx < totalCategories - 1) {
      setCurrentCategoryIdx((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentCategoryIdx > 0) {
      setCurrentCategoryIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result: QuestionnaireAnswer[] = QUESTIONS
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        category: q.category,
        answer: answers[q.id].trim(),
      }));
    onSubmit(result);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{t(`categories.${currentCategory}`)}</h2>
          <span className="text-sm text-stone-400">
            {currentCategoryIdx + 1}/{totalCategories}
          </span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-1.5">
          <div
            className="bg-violet-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {categoryQuestions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t(`questions.${q.id}`) || q.question}
            </label>
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder={t(`placeholders.${q.id}`) || q.placeholder}
              rows={2}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={currentCategoryIdx === 0 ? onSkip : handleBack}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-stone-200 rounded-xl hover:bg-stone-50"
        >
          {currentCategoryIdx === 0 ? t('skip') : <><ArrowLeft className="w-4 h-4" />{t('back')}</>}
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : currentCategoryIdx === totalCategories - 1 ? (
            t('submit')
          ) : (
            <>{t('next')}<ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
