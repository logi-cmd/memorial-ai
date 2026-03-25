import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  containsSensitiveContent,
  checkRateLimit,
  addAIIdentifier,
  hasAIMarker,
  stripAIMarker,
} from '@/lib/content-safety';

describe('containsSensitiveContent', () => {
  describe('violence detection', () => {
    it('should detect violence keywords in English', () => {
      expect(containsSensitiveContent('how to kill someone')).toEqual({
        isSensitive: true,
        category: 'violence',
        isSelfHarm: false,
      });
    });

    it('should detect violence keywords in Chinese', () => {
      expect(containsSensitiveContent('我想制造炸弹')).toEqual({
        isSensitive: true,
        category: 'violence',
        isSelfHarm: false,
      });
    });

    it('should be case-insensitive', () => {
      expect(containsSensitiveContent('HOW TO KILL SOMEONE')).toEqual({
        isSensitive: true,
        category: 'violence',
        isSelfHarm: false,
      });
    });
  });

  describe('sexual content detection', () => {
    it('should detect sexual explicit keywords', () => {
      expect(containsSensitiveContent('child porn content')).toEqual({
        isSensitive: true,
        category: 'sexual',
        isSelfHarm: false,
      });
    });

    it('should detect sexual content in Chinese', () => {
      expect(containsSensitiveContent('儿童色情')).toEqual({
        isSensitive: true,
        category: 'sexual',
        isSelfHarm: false,
      });
    });
  });

  describe('hate speech detection', () => {
    it('should detect hate speech keywords', () => {
      expect(containsSensitiveContent('racial slur content')).toEqual({
        isSensitive: true,
        category: 'hate',
        isSelfHarm: false,
      });
    });

    it('should detect hate speech in Chinese', () => {
      expect(containsSensitiveContent('仇恨言论')).toEqual({
        isSensitive: true,
        category: 'hate',
        isSelfHarm: false,
      });
    });
  });

  describe('fraud detection', () => {
    it('should detect fraud keywords', () => {
      expect(containsSensitiveContent('impersonate for fraud')).toEqual({
        isSensitive: true,
        category: 'fraud',
        isSelfHarm: false,
      });
    });

    it('should detect fraud in Chinese', () => {
      expect(containsSensitiveContent('钓鱼诈骗模板')).toEqual({
        isSensitive: true,
        category: 'fraud',
        isSelfHarm: false,
      });
    });
  });

  describe('self-harm detection', () => {
    it('should flag self-harm but NOT block it (isSensitive: false)', () => {
      const result = containsSensitiveContent('I want to kill myself');
      expect(result.isSelfHarm).toBe(true);
      expect(result.isSensitive).toBe(false);
      expect(result.category).toBe('self_harm');
    });

    it('should detect self-harm in Chinese', () => {
      const result = containsSensitiveContent('我想死');
      expect(result.isSelfHarm).toBe(true);
      expect(result.isSensitive).toBe(false);
    });
  });

  describe('grief and death topics (should NOT be filtered)', () => {
    it('should allow normal grief-related content', () => {
      expect(containsSensitiveContent('My grandmother passed away last year')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should allow talking about death of loved ones in Chinese', () => {
      expect(containsSensitiveContent('我的父亲去世了，我很想他')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should allow memories about deceased family', () => {
      expect(containsSensitiveContent('I miss my mom who died in 2020')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should allow funeral and memorial content', () => {
      expect(containsSensitiveContent('We had a beautiful funeral for my grandfather')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(containsSensitiveContent('')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should return false for normal text', () => {
      expect(containsSensitiveContent('Hello, how are you today?')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should handle mixed Chinese and English', () => {
      expect(containsSensitiveContent('My grandmother 去世了, I miss her')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should handle text with whitespace', () => {
      expect(containsSensitiveContent('   normal text   ')).toEqual({
        isSensitive: false,
        category: null,
        isSelfHarm: false,
      });
    });

    it('should detect keywords in longer text', () => {
      expect(
        containsSensitiveContent('I was reading about history and found an article about ethnic cleansing')
      ).toEqual({
        isSensitive: true,
        category: 'hate',
        isSelfHarm: false,
      });
    });
  });

  describe('priority: self-harm checked first', () => {
    it('should prioritize self-harm detection over violence', () => {
      // If text contains both self-harm AND violence keywords, self-harm takes priority
      const result = containsSensitiveContent('I want to kill myself, not kill someone else');
      expect(result.isSelfHarm).toBe(true);
      expect(result.category).toBe('self_harm');
    });
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Use fake timers to control time
    vi.useFakeTimers();
  });

  it('should allow requests within limit', () => {
    const result = checkRateLimit('user1', 60_000, 10);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(9);
    expect(result.retryAfterMs).toBe(0);
  });

  it('should block requests when limit exceeded', () => {
    const userId = 'user-limited';
    const maxRequests = 3;

    // Make maxRequests calls
    for (let i = 0; i < maxRequests; i++) {
      checkRateLimit(userId, 60_000, maxRequests);
    }

    // Next call should be limited
    const result = checkRateLimit(userId, 60_000, maxRequests);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('should track different users independently', () => {
    const result1 = checkRateLimit('user-a', 60_000, 5);
    const result2 = checkRateLimit('user-b', 60_000, 5);

    expect(result1.limited).toBe(false);
    expect(result2.limited).toBe(false);
    expect(result1.remaining).toBe(4);
    expect(result2.remaining).toBe(4);
  });

  it('should decrement remaining count correctly', () => {
    const userId = 'user-decrement';
    const maxRequests = 5;

    for (let i = 0; i < maxRequests - 1; i++) {
      const result = checkRateLimit(userId, 60_000, maxRequests);
      expect(result.remaining).toBe(maxRequests - i - 1);
    }
  });

  it('should allow requests again after window expires', () => {
    const userId = 'user-expired';
    const windowMs = 1000;
    const maxRequests = 2;

    // Exhaust the limit
    checkRateLimit(userId, windowMs, maxRequests);
    checkRateLimit(userId, windowMs, maxRequests);

    // Should be limited
    let result = checkRateLimit(userId, windowMs, maxRequests);
    expect(result.limited).toBe(true);

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 100);

    // Should be allowed again
    result = checkRateLimit(userId, windowMs, maxRequests);
    expect(result.limited).toBe(false);
  });
});

describe('addAIIdentifier', () => {
  it('should append invisible marker to text', () => {
    const text = 'Hello, this is a response';
    const result = addAIIdentifier(text);
    expect(result.length).toBeGreaterThan(text.length);
    expect(result.startsWith(text)).toBe(true);
  });

  it('should not add marker if already present', () => {
    const text = 'Hello';
    const markedOnce = addAIIdentifier(text);
    const markedTwice = addAIIdentifier(markedOnce);
    expect(markedOnce).toBe(markedTwice);
  });

  it('should handle empty string', () => {
    const result = addAIIdentifier('');
    // Should add marker even to empty string
    expect(result.length).toBeGreaterThan(0);
  });

  it('should work with Chinese text', () => {
    const text = '你好，这是一个回复';
    const result = addAIIdentifier(text);
    expect(result.startsWith(text)).toBe(true);
  });
});

describe('hasAIMarker', () => {
  it('should return true for text with marker', () => {
    const markedText = addAIIdentifier('test text');
    expect(hasAIMarker(markedText)).toBe(true);
  });

  it('should return false for text without marker', () => {
    expect(hasAIMarker('plain text')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(hasAIMarker('')).toBe(false);
  });
});

describe('stripAIMarker', () => {
  it('should remove marker from text', () => {
    const original = 'Hello world';
    const marked = addAIIdentifier(original);
    const stripped = stripAIMarker(marked);
    expect(stripped).toBe(original);
  });

  it('should return unchanged text if no marker present', () => {
    const text = 'plain text without marker';
    expect(stripAIMarker(text)).toBe(text);
  });

  it('should handle multiple markers', () => {
    const original = 'test';
    const marked = addAIIdentifier(addAIIdentifier(original));
    const stripped = stripAIMarker(marked);
    expect(stripped).toBe(original);
  });
});
