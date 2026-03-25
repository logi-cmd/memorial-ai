import { describe, it, expect } from 'vitest';
import {
  PRESET_TEMPLATES,
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONS,
  renderQuestionnaireContext,
  PresetTemplate,
  QuestionnaireAnswer,
} from '@/lib/questionnaire';

describe('PRESET_TEMPLATES', () => {
  it('should have at least 3 presets', () => {
    expect(PRESET_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('should have unique preset IDs', () => {
    const ids = PRESET_TEMPLATES.map((preset) => preset.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  describe('required fields validation', () => {
    it('all presets should have required fields', () => {
      const requiredFields: (keyof PresetTemplate)[] = ['id', 'name', 'description', 'relationship_type', 'questions'];

      PRESET_TEMPLATES.forEach((preset) => {
        requiredFields.forEach((field) => {
          expect(preset[field]).toBeDefined();
        });
      });
    });

    it('all presets should have name.zh and name.en', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        expect(preset.name.zh).toBeDefined();
        expect(preset.name.zh.length).toBeGreaterThan(0);
        expect(preset.name.en).toBeDefined();
        expect(preset.name.en.length).toBeGreaterThan(0);
      });
    });

    it('all presets should have description.zh and description.en', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        expect(preset.description.zh).toBeDefined();
        expect(preset.description.zh.length).toBeGreaterThan(0);
        expect(preset.description.en).toBeDefined();
        expect(preset.description.en.length).toBeGreaterThan(0);
      });
    });

    it('all presets should have valid relationship_type', () => {
      const validTypes = ['deceased', 'family'];
      PRESET_TEMPLATES.forEach((preset) => {
        expect(validTypes).toContain(preset.relationship_type);
      });
    });
  });

  describe('questions validation', () => {
    it('all presets should have at least 4 questions', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        expect(preset.questions.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('all questions should have required fields', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        preset.questions.forEach((q) => {
          expect(q.id).toBeDefined();
          expect(q.category).toBeDefined();
          expect(q.question).toBeDefined();
          expect(q.question.length).toBeGreaterThan(0);
        });
      });
    });

    it('all question categories should be valid', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        preset.questions.forEach((q) => {
          expect(QUESTIONNAIRE_CATEGORIES).toContain(q.category);
        });
      });
    });

    it('questions within each preset should have unique IDs', () => {
      PRESET_TEMPLATES.forEach((preset) => {
        const ids = preset.questions.map((q) => q.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });

  describe('family presets', () => {
    it('should have presets with relationship_type "family"', () => {
      const familyPresets = PRESET_TEMPLATES.filter((p) => p.relationship_type === 'family');
      expect(familyPresets.length).toBeGreaterThan(0);
    });

    it('living-parent should be a family preset', () => {
      const livingParent = PRESET_TEMPLATES.find((p) => p.id === 'living-parent');
      expect(livingParent).toBeDefined();
      expect(livingParent!.relationship_type).toBe('family');
    });

    it('growing-child should be a family preset', () => {
      const growingChild = PRESET_TEMPLATES.find((p) => p.id === 'growing-child');
      expect(growingChild).toBeDefined();
      expect(growingChild!.relationship_type).toBe('family');
    });
  });
});

describe('QUESTIONNAIRE_CATEGORIES', () => {
  it('should have 5 categories', () => {
    expect(QUESTIONNAIRE_CATEGORIES).toHaveLength(5);
  });

  it('should contain expected categories', () => {
    expect(QUESTIONNAIRE_CATEGORIES).toContain('personality');
    expect(QUESTIONNAIRE_CATEGORIES).toContain('life_events');
    expect(QUESTIONNAIRE_CATEGORIES).toContain('relationships');
    expect(QUESTIONNAIRE_CATEGORIES).toContain('habits');
    expect(QUESTIONNAIRE_CATEGORIES).toContain('values');
  });
});

describe('QUESTIONS', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(QUESTIONS)).toBe(true);
    expect(QUESTIONS.length).toBeGreaterThan(0);
  });

  it('all questions should have unique IDs', () => {
    const ids = QUESTIONS.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all questions should have valid categories', () => {
    QUESTIONS.forEach((q) => {
      expect(QUESTIONNAIRE_CATEGORIES).toContain(q.category);
    });
  });

  it('should have questions in each category', () => {
    QUESTIONNAIRE_CATEGORIES.forEach((category) => {
      const categoryQuestions = QUESTIONS.filter((q) => q.category === category);
      expect(categoryQuestions.length).toBeGreaterThan(0);
    });
  });
});

describe('renderQuestionnaireContext', () => {
  it('should return empty string for empty answers', () => {
    expect(renderQuestionnaireContext([])).toBe('');
  });

  it('should render answers grouped by category', () => {
    const answers: QuestionnaireAnswer[] = [
      { questionId: 'p1', category: 'personality', answer: 'Kind and caring' },
      { questionId: 'h1', category: 'habits', answer: 'Walks every morning' },
    ];

    const result = renderQuestionnaireContext(answers);
    expect(result).toContain('问卷补充信息');
    expect(result).toContain('性格特质');
    expect(result).toContain('日常习惯');
    expect(result).toContain('Kind and caring');
    expect(result).toContain('Walks every morning');
  });

  it('should handle single answer', () => {
    const answers: QuestionnaireAnswer[] = [
      { questionId: 'p1', category: 'personality', answer: 'Test answer' },
    ];

    const result = renderQuestionnaireContext(answers);
    expect(result).toContain('Test answer');
  });

  it('should include question text when found', () => {
    const answers: QuestionnaireAnswer[] = [
      { questionId: 'p1', category: 'personality', answer: 'Very kind' },
    ];

    const result = renderQuestionnaireContext(answers);
    // p1 question is 'TA 最大的性格特点是什么？'
    expect(result).toContain('TA 最大的性格特点是什么？');
  });

  it('should handle unknown questionId gracefully', () => {
    const answers: QuestionnaireAnswer[] = [
      { questionId: 'unknown-id', category: 'personality', answer: 'Some answer' },
    ];

    // Should not throw
    const result = renderQuestionnaireContext(answers);
    expect(result).toContain('Some answer');
    expect(result).toContain('unknown-id');
  });
});
