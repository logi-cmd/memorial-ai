import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export interface ProactiveMessage {
  id?: string;
  avatar_id: string;
  type: 'birthday' | 'anniversary' | 'high_importance_memory' | 'emotional_checkin';
  title: string;
  content: string;
  dismissed: boolean;
  sent: boolean;
  created_at?: string;
}

/**
 * 判断是否应该生成主动消息
 */
export async function shouldGenerateProactive(
  avatarName: string,
  summaryText: string,
  recentMemories: Array<{ content: string; importance: number; memory_type: string }>
): Promise<{ should: boolean; type: ProactiveMessage['type']; reason: string }> {
  // 规则引擎 + LLM 判断
  const highImportance = recentMemories.filter((m) => m.importance >= 8);
  const emotionalMemories = recentMemories.filter((m) =>
    m.memory_type === 'life_event' && m.importance >= 6
  );

  if (highImportance.length > 0) {
    return {
      should: true,
      type: 'high_importance_memory',
      reason: `发现 ${highImportance.length} 条高重要度记忆`,
    };
  }

  if (emotionalMemories.length >= 2) {
    return {
      should: true,
      type: 'emotional_checkin',
      reason: '发现多条重要人生事件记忆',
    };
  }

  // LLM 判断：对话摘要中是否有触发主动消息的内容
  const hasBirthday = summaryText.includes('生日') || summaryText.includes('birthday');
  const hasAnniversary = summaryText.includes('纪念日') || summaryText.includes('anniversary');

  if (hasBirthday) {
    return { should: true, type: 'birthday', reason: '对话提到生日' };
  }
  if (hasAnniversary) {
    return { should: true, type: 'anniversary', reason: '对话提到纪念日' };
  }

  return { should: false, type: 'emotional_checkin', reason: '无触发条件' };
}

/**
 * 生成主动消息内容
 */
export async function generateProactiveMessage(
  avatarName: string,
  type: ProactiveMessage['type'],
  context: string
): Promise<{ title: string; content: string }> {
  const prompts: Record<string, string> = {
    birthday: `你正在为${avatarName}生成一条主动消息。今天是关于 TA 的生日相关的话题。用温暖、自然的方式生成一条简短消息（1-2句），表达关心或回忆。`,
    anniversary: `你正在为${avatarName}生成一条主动消息。话题是关于纪念日的。用温暖的方式生成一条简短消息。`,
    high_importance_memory: `你正在为${avatarName}生成一条主动消息。基于以下记忆，生成一条简短消息来提起这个话题：\n${context}`,
    emotional_checkin: `你正在为${avatarName}生成一条主动消息。基于以下信息，生成一条温柔的关心消息：\n${context}`,
  };

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompts[type] || prompts.emotional_checkin }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  const titles: Record<string, string> = {
    birthday: `关于 ${avatarName} 的生日`,
    anniversary: `${avatarName} 的纪念日`,
    high_importance_memory: `${avatarName} 想起了一些事`,
    emotional_checkin: `${avatarName} 想和你聊聊天`,
  };

  return {
    title: titles[type] || `${avatarName} 的消息`,
    content: text.trim(),
  };
}
