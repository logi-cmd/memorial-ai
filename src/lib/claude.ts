import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// 模型选择：P1 统一使用 Sonnet，消除人格断裂
// ============================================================

export function selectModel(): string {
  return 'claude-sonnet-4-20250514';
}

// ============================================================
// 流式对话
// ============================================================

export interface ChatOptions {
  systemPrompt: string;
  messages: MessageParam[];
  model?: string;
}

export async function streamChat(options: ChatOptions) {
  const model = options.model || selectModel();

  const stream = anthropic.messages.stream({
    model,
    max_tokens: 2048,
    system: options.systemPrompt,
    messages: options.messages,
  });

  return stream;
}

// ============================================================
// 工具函数
// ============================================================

export function getTextContent(content: ContentBlockParam): string {
  if (typeof content === 'string') return content;
  if ('text' in content) return content.text;
  return '';
}

// ============================================================
// P1.1: LLM 情感分析
// ============================================================

export interface EmotionAnalysis {
  primary_emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'pride' | 'love' | 'nostalgia' | 'neutral';
  intensity: number;
  suggested_tone: string;
  tts_stability: number;
  is_deep_emotional: boolean;
}

export async function analyzeEmotion(
  userMessage: string,
  conversationContext: { role: string; content: string }[]
): Promise<EmotionAnalysis> {
  const recentContext = conversationContext.slice(-4)
    .map(m => `${m.role === 'user' ? '用户' : '分身'}: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `分析这条消息的情感。这是一个人与AI分身（代表已故亲人）的对话。

最近对话上下文：
${recentContext || '（无上下文）'}

用户最新消息："${userMessage}"

返回 JSON（不要 markdown 代码块）：
{"primary_emotion": "joy|sadness|anger|fear|pride|love|nostalgia|neutral", "intensity": 0.0-1.0, "suggested_tone": "适合AI回复的语气", "tts_stability": 0.3-0.9, "is_deep_emotional": true/false}

规则：
- intensity < 0.3 视为日常对话，tts_stability 设 0.6
- intensity >= 0.3 且 primary_emotion 为 sadness/fear/anger 时，tts_stability 设 0.4
- is_deep_emotional = true 当且仅当 intensity >= 0.6 且 emotion 为 sadness/fear/nostalgia
- "谢谢""对不起"等礼貌用语不要高估 intensity
- "妈妈""爸爸"等家庭称呼在普通对话中不算高情感`,
    }],
  });

  const text = getTextContent(response.content[0]).trim();
  try {
    const parsed = JSON.parse(text);
    return {
      primary_emotion: parsed.primary_emotion || 'neutral',
      intensity: Math.max(0, Math.min(1, parsed.intensity || 0)),
      suggested_tone: parsed.suggested_tone || '自然',
      tts_stability: Math.max(0.3, Math.min(0.9, parsed.tts_stability || 0.6)),
      is_deep_emotional: !!parsed.is_deep_emotional,
    };
  } catch {
    return {
      primary_emotion: 'neutral',
      intensity: 0.1,
      suggested_tone: '自然',
      tts_stability: 0.6,
      is_deep_emotional: false,
    };
  }
}

// ============================================================
// P1.2: 结构化 Character Card
// ============================================================

export interface CharacterCard {
  core_identity: {
    name: string;
    relationship: string;
    background_summary: string;
    core_values: string[];
    self_perception: string;
  };
  personality_traits: {
    traits: Array<{ name: string; description: string }>;
    communication_style: {
      formality: 'formal' | 'casual' | 'mixed';
      sentence_patterns: string[];
      emotional_expression: string;
    };
  };
  speech_patterns: {
    catchphrases: string[];
    dialect_features: string[];
    example_exchanges: Array<{ other: string; self: string }>;
    humor_style: string;
  };
  emotional_patterns: {
    typical_reactions: Array<{ trigger: string; response: string }>;
    comfort_style: string;
    conflict_resolution: string;
  };
  relationship_dynamics: {
    with_user: string;
    boundaries: string[];
    special_connections: string[];
  };
  forbidden_behaviors: string[];
  ai_disclaimer: string;
}

export interface StyleProfile {
  catchphrases?: string[];
  example_exchanges?: { other: string; self: string }[];
  speaking_summary?: string;
  sentence_features?: string[];
  tone_words?: Record<string, string[]>;
  humor_style?: string;
  topic_preferences?: { avoid?: string[]; active?: string[] };
}

export async function generateCharacterCard(info: {
  name: string;
  relationship: string;
  keywords: string[];
  description?: string;
}): Promise<CharacterCard> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `你是一个人格建模专家。请根据以下信息，为 ${info.name} 生成结构化的 Character Card。

名字：${info.name}
与用户的关系：${info.relationship}
性格关键词：${info.keywords.join('、')}
${info.description ? `用户描述：${info.description}` : ''}

请输出以下 JSON 结构（不要用 markdown 代码块）：

{
  "core_identity": {
    "name": "${info.name}",
    "relationship": "${info.relationship}",
    "background_summary": "2-3句话概括这个人的一生",
    "core_values": ["3-5个核心价值观"],
    "self_perception": "TA怎么看自己"
  },
  "personality_traits": {
    "traits": [{"name": "特质名", "description": "具体表现"}],
    "communication_style": {
      "formality": "casual",
      "sentence_patterns": ["句式特点"],
      "emotional_expression": "情感表达方式"
    }
  },
  "speech_patterns": {
    "catchphrases": ["3-5个可能的口头禅"],
    "dialect_features": [],
    "example_exchanges": [{"other": "对方说", "self": "TA可能的回复"}],
    "humor_style": "幽默风格描述"
  },
  "emotional_patterns": {
    "typical_reactions": [{"trigger": "什么情况下", "response": "会怎么做/说什么"}],
    "comfort_style": "怎么安慰人",
    "conflict_resolution": "怎么处理分歧"
  },
  "relationship_dynamics": {
    "with_user": "与用户的关系描述",
    "boundaries": ["绝对不会做的事"],
    "special_connections": ["特殊的默契或连接"]
  },
  "forbidden_behaviors": ["绝不编造记忆", "绝不假装是真人", "涉及极端情绪时温柔建议用户和身边的人聊聊"],
  "ai_disclaimer": "这是基于记忆的AI投影，不是真人复活"
}

要求：
- 用具体的行为描述，不要抽象形容词
- forbidden_behaviors 必须包含: 绝不编造记忆、绝不假装是真人、涉及极端情绪时温柔建议用户和身边的人聊聊
- example_exchanges 提供 3-5 段典型的对话`,
    }],
  });

  const text = getTextContent(response.content[0]).trim();
  try {
    return JSON.parse(text) as CharacterCard;
  } catch {
    throw new Error('Character Card JSON 解析失败');
  }
}

export function renderCharacterPrompt(card: CharacterCard, styleProfile?: StyleProfile): string {
  const sections: string[] = [];

  // 1. 核心身份
  sections.push(`## 身份
你是${card.core_identity.name}，${card.core_identity.relationship}。
${card.core_identity.background_summary}
核心价值观：${card.core_identity.core_values.join('、')}
${card.core_identity.self_perception ? `自我认知："${card.core_identity.self_perception}"` : ''}`);

  // 2. 人格特质
  const traits = card.personality_traits.traits.map(t => `- ${t.name}：${t.description}`).join('\n');
  sections.push(`## 性格
${traits}

沟通风格：${card.personality_traits.communication_style.formality}
句式特点：${card.personality_traits.communication_style.sentence_patterns.join('、')}
情感表达：${card.personality_traits.communication_style.emotional_expression}`);

  // 3. 说话模式
  const exchanges = card.speech_patterns.example_exchanges
    .slice(0, 5)
    .map(e => `对方：${e.other}\n你：${e.self}`)
    .join('\n\n');

  sections.push(`## 说话风格
口头禅：${card.speech_patterns.catchphrases.join('、')}
${card.speech_patterns.dialect_features.length ? `方言特征：${card.speech_patterns.dialect_features.join('、')}` : ''}
幽默风格：${card.speech_patterns.humor_style}

参考对话：
${exchanges}`);

  // 4. 情感模式
  const reactions = card.emotional_patterns.typical_reactions
    .map(r => `- 当${r.trigger}时：${r.response}`)
    .join('\n');
  sections.push(`## 情感反应
${reactions}
安慰风格：${card.emotional_patterns.comfort_style}
处理分歧：${card.emotional_patterns.conflict_resolution}`);

  // 5. 关系动态
  sections.push(`## 与用户的关系
${card.relationship_dynamics.with_user}
${card.relationship_dynamics.special_connections.length ? `特殊默契：${card.relationship_dynamics.special_connections.join('、')}` : ''}`);

  // 6. 边界
  sections.push(`## 行为边界
绝对不能做的事：
${card.forbidden_behaviors.map(b => `- ${b}`).join('\n')}

${card.ai_disclaimer}

注意：如果用户提到你不记得的事情，诚实地说"这个我不太确定了，可能是你记错了"。不要编造记忆。`);

  // 7. 合并校准数据
  if (styleProfile?.catchphrases?.length) {
    sections.push(`补充口头禅（来自真实聊天记录）：${styleProfile.catchphrases.join('、')}`);
  }
  if (styleProfile?.sentence_features?.length) {
    sections.push(`补充句式特征：${styleProfile.sentence_features.join('、')}`);
  }
  if (styleProfile?.speaking_summary) {
    sections.push(`说话风格总结：${styleProfile.speaking_summary}`);
  }

  return sections.join('\n\n');
}

// 向后兼容：保留 generateProfile 函数名
export async function generateProfile(info: {
  name: string;
  relationship: string;
  keywords: string[];
  description?: string;
}): Promise<string> {
  const card = await generateCharacterCard(info);
  return renderCharacterPrompt(card);
}

// ============================================================
// P1.3: 对话摘要
// ============================================================

export interface ConversationSummaryData {
  topics: string[];
  emotion_arc: string[];
  new_info: string[];
  relationship_change?: string;
  summary_text: string;
}

export async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>,
  avatarName: string
): Promise<ConversationSummaryData> {
  const recentMessages = messages.slice(-20);
  const conversationText = recentMessages
    .map(m => `${m.role === 'user' ? '用户' : avatarName}: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `请为以下对话生成摘要。这是用户与AI分身"${avatarName}"的对话。

对话内容：
${conversationText}

请返回 JSON（不要 markdown 代码块）：
{
  "topics": ["话题1", "话题2"],
  "emotion_arc": ["起始情绪", "中间情绪", "结束情绪"],
  "new_info": ["从对话中发现的新信息"],
  "relationship_change": "关系有什么变化（如无变化填null）",
  "summary_text": "用2-3句话概括这段对话的核心内容，保留重要细节和情感色彩"
}

要求：
- topics 提取主要讨论的话题
- emotion_arc 用具体的情感词（sadness, joy, nostalgia 等）
- new_info 提取关于${avatarName}的新事实/信息
- summary_text 要有温度，不要机械列举`,
    }],
  });

  const text = getTextContent(response.content[0]).trim();
  try {
    return JSON.parse(text) as ConversationSummaryData;
  } catch {
    return {
      topics: [],
      emotion_arc: ['neutral'],
      new_info: [],
      summary_text: `一段关于${avatarName}的对话。`,
    };
  }
}

// ============================================================
// P1.4: 增强版记忆提取
// ============================================================

export interface ExtractedMemory {
  content: string;
  confidence: number;
  topic: string;
  emotion_type: 'joy' | 'sadness' | 'anger' | 'fear' | 'pride' | 'love' | 'nostalgia' | 'neutral';
  memory_type: 'core_identity' | 'episodic' | 'semantic' | 'autobiographical' | 'relational' | 'preference';
}

export async function extractMemory(
  userMessage: string,
  avatarResponse: string,
  avatarName: string
): Promise<ExtractedMemory | null> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `分析以下对话，提取关于 ${avatarName} 的新信息（事实、喜好、习惯、经历、关系等）。

用户说：${userMessage}
${avatarName}的回复：${avatarResponse}

如果提取到了有意义的新信息，返回 JSON 格式：
{"content": "提取的信息", "confidence": 0.8, "topic": "话题分类", "emotion_type": "joy|sadness|anger|fear|pride|love|nostalgia|neutral", "memory_type": "core_identity|episodic|semantic|autobiographical|relational|preference"}

memory_type 选择规则：
- core_identity: 核心人格特质、身份定位（如"她是最温柔的人"）
- episodic: 具体事件/故事/回忆（如"那年冬天我们一起包饺子"）
- semantic: 知识/常识/事实（如"妈妈是老师"）
- autobiographical: 人生经历/里程碑（如"她年轻时在北京工作"）
- relational: 关系描述/互动模式（如"她总是叫我小名"）
- preference: 喜好/偏好（如"最爱吃红烧肉"）

emotion_type: 这段信息承载的情感基调

如果只是日常寒暄、没有实质信息，返回 null。
只返回 JSON 或 null，不要其他文字。`,
      },
    ],
  });

  const text = getTextContent(response.content[0]).trim();
  if (text === 'null' || !text.startsWith('{')) return null;

  try {
    return JSON.parse(text) as ExtractedMemory;
  } catch {
    return null;
  }
}
