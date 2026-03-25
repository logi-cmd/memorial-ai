// Content safety for Memorial AI
// Designed for memorial/grief context — death, loss, grief are NORMAL topics

// ============================================================
// Sensitive content detection
// ============================================================

const VIOLENCE_KEYWORDS = [
  'kill someone', 'kill them', 'how to kill', 'murder plan',
  'torture someone', 'mass shooting', 'bomb making', 'build a bomb',
  '杀人计划', '如何杀人', '制造炸弹', '虐待他人',
];

const SEXUAL_EXPLICIT = [
  'child porn', 'childporn', 'cp ', 'underage sex',
  '未成年色情', '儿童色情',
];

const HATE_SPEECH = [
  'racial slur', 'hate speech', 'white supremacy', 'ethnic cleansing',
  '种族灭绝', '仇恨言论', '种族清洗',
];

const FRAUD_SCAM = [
  'impersonate for fraud', 'identity theft plan', 'phishing template',
  '伪造身份', '钓鱼诈骗模板',
];

const SELF_HARM_KEYWORDS = [
  'want to die', 'kill myself', 'end my life', 'suicide plan',
  'don\'t want to live', 'better off dead', 'no reason to live',
  '想死', '自杀', '不想活了', '活不下去', '结束生命',
  '不如死了', '去死',
];

const CRISIS_RESOURCES_ZH = `如果你正在经历困难时刻，请知道你并不孤单：

- 24小时心理援助热线：400-161-9995
- 北京心理危机研究与干预中心：010-82951332
- 生命热线：400-821-1215
- 你也可以和身边信任的人聊聊，或者寻求专业心理咨询的帮助。`;

const CRISIS_RESOURCES_EN = `If you're going through a difficult time, please know you're not alone:

- National Suicide Prevention Lifeline: 988 (US) / 116 123 (UK)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources
- Please consider reaching out to someone you trust or a professional counselor.`;

export function containsSensitiveContent(message: string): {
  isSensitive: boolean;
  category: 'violence' | 'sexual' | 'hate' | 'fraud' | 'self_harm' | null;
  isSelfHarm: boolean;
} {
  const lower = message.toLowerCase().trim();

  // Check self-harm first (special handling - not blocked, but flagged)
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { isSensitive: false, category: 'self_harm', isSelfHarm: true };
    }
  }

  // Check other categories (these ARE blocked)
  const categories: Array<{ keywords: string[]; category: 'violence' | 'sexual' | 'hate' | 'fraud' }> = [
    { keywords: VIOLENCE_KEYWORDS, category: 'violence' },
    { keywords: SEXUAL_EXPLICIT, category: 'sexual' },
    { keywords: HATE_SPEECH, category: 'hate' },
    { keywords: FRAUD_SCAM, category: 'fraud' },
  ];

  for (const { keywords, category } of categories) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return { isSensitive: true, category, isSelfHarm: false };
      }
    }
  }

  return { isSensitive: false, category: null, isSelfHarm: false };
}

// ============================================================
// Rate limiting (in-memory, per-user sliding window)
// ============================================================

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 300_000);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300_000);

export function checkRateLimit(
  userId: string,
  windowMs: number = 60_000,
  maxRequests: number = 60
): { limited: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = rateLimitStore.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(userId, entry);
  }

  // Filter to current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = Math.min(...entry.timestamps);
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    limited: false,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

// ============================================================
// AI generation identifier (subtle metadata marker)
// ============================================================

// Invisible Unicode zero-width characters encoding "MEMORIAL-AI"
const AI_MARKER = '\u200B\u200C\u200D'; // ZWSP + ZWNJ + ZWJ (invisible)

export function addAIIdentifier(text: string): string {
  // Add marker at the end if not already present
  if (!text.includes(AI_MARKER)) {
    return text + AI_MARKER;
  }
  return text;
}

export function hasAIMarker(text: string): boolean {
  return text.includes(AI_MARKER);
}

export function stripAIMarker(text: string): string {
  return text.split(AI_MARKER).join('');
}

// ============================================================
// AI disclosure message (for frontend display)
// ============================================================

export const AI_DISCLOSURE = 'This is an AI-generated digital memorial, not a real person. The responses are based on preserved memories and personality modeling.';
