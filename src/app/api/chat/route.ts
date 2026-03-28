import { NextRequest, NextResponse } from 'next/server';
import {
  getAvatarById,
  getMemories,
  createMemory,
  createConversation,
  getMessages,
  addMessage,
  getConversations,
  createProactiveMessage,
} from '@/lib/db';
import { getAppConfig } from '@/lib/providers/config';
import { getLLMProvider, getEmbeddingProvider } from '@/lib/providers';
import {
  streamChat,
  selectModel,
  extractMemory,
  analyzeEmotion,
  generateConversationSummary,
  renderCharacterPrompt,
} from '@/lib/claude';
import type { CharacterCard, StyleProfile, ConversationSummaryData } from '@/lib/claude';
import { generateEmbedding } from '@/lib/embedding';
import { evolveCharacterCard, applyEvolutionPatch } from '@/lib/evolution';
import { shouldGenerateProactive, generateProactiveMessage } from '@/lib/proactive';
import { containsSensitiveContent, checkRateLimit, addAIIdentifier } from '@/lib/content-safety';

interface ChatRequestBody {
  avatarId: string;
  message: string;
  conversationId?: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function getRelevantMemories(avatarId: string, queryEmbedding: number[], limit = 7) {
  const allMemories = getMemories(avatarId) as any[];
  const scored = allMemories
    .filter((m) => m.embedding)
    .map((m) => ({
      ...m,
      similarity: cosineSimilarity(queryEmbedding, m.embedding),
    }))
    .filter((m) => m.similarity > 0.3)
    .sort((a, b) => b.similarity * (b.importance || 1) - a.similarity * (a.importance || 1));
  return scored.slice(0, limit);
}

async function ollamaStreamChatWrapper(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
) {
  const config = getAppConfig();
  const llmMod = getLLMProvider(config);
  const response = await llmMod.ollamaStreamChat(messages, systemPrompt);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitter = {
    _textCallbacks: [] as Array<(text: string) => void>,
    _done: false,
    _fullText: '',
    on(event: string, cb: (text: string) => void) {
      if (event === 'text') this._textCallbacks.push(cb);
    },
    async finalMessage() {
      while (!this._done) {
        await this._pump();
      }
      return { content: [{ type: 'text', text: this._fullText }] };
    },
    async _pump() {
      if (!reader) { this._done = true; return; }
      const { value, done } = await reader.read();
      if (done) { this._done = true; return; }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            this._fullText += data.message.content;
            for (const cb of this._textCallbacks) cb(data.message.content);
          }
          if (data.done) this._done = true;
        } catch {}
      }
    },
  };

  return emitter;
}

export async function POST(request: NextRequest) {
  try {
    const { avatarId, message, conversationId } = (await request.json()) as ChatRequestBody;

    if (!avatarId || !message) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const safety = containsSensitiveContent(message);
    if (safety.isSensitive) {
      return NextResponse.json(
        { error: '该消息包含不适当内容，请修改后重试' },
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit('local-user');
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      );
    }

    const avatar = getAvatarById(avatarId) as any;
    if (!avatar) {
      return NextResponse.json({ error: '分身不存在' }, { status: 404 });
    }

    const config = getAppConfig();
    const embeddingMod = getEmbeddingProvider(config);
    const embedFn = config.embedding.provider === 'local'
      ? embeddingMod.localGenerateEmbedding
      : generateEmbedding;

    const queryEmbedding = await embedFn(message);
    const relevantMemories = await getRelevantMemories(avatarId, queryEmbedding);

    const importantMemories = relevantMemories
      .filter((m: any) => m.type === 'core_identity')
      .map((m: any) => ({ content: m.content, id: m.id }));
    const relatedMemories = relevantMemories
      .filter((m: any) => m.type !== 'core_identity')
      .map((m: any) => ({ content: m.content, id: m.id }));

    const styleProfile = avatar.profile as StyleProfile | null;
    const characterCard = avatar.character_card as CharacterCard | null;
    let enhancedPrompt: string;

    if (characterCard) {
      enhancedPrompt = renderCharacterPrompt(characterCard, styleProfile ?? undefined);
    } else {
      enhancedPrompt = `你是${avatar.name}，${avatar.relationship}。`;
      if (styleProfile?.example_exchanges?.length) {
        const styleSection = styleProfile.example_exchanges
          .slice(0, 5)
          .map((e: { other: string; self: string }) => `对方：${e.other}\nTA：${e.self}`)
          .join('\n\n');
        enhancedPrompt += `\n\n## 说话风格参考（基于真实聊天记录）\n${styleSection}`;
        if (styleProfile.catchphrases?.length) {
          enhancedPrompt += `\n常用口头禅/语气词：${styleProfile.catchphrases.join('、')}`;
        }
      }
      enhancedPrompt += '\n\n注意：如果用户提到你不记得的事情，诚实地说"这个我不太确定了，可能是你记错了"。不要编造记忆。';
    }

    if (importantMemories.length > 0) {
      enhancedPrompt += `\n\n## 核心身份记忆\n${importantMemories.map((m: { content: string }) => `- ${m.content}`).join('\n')}`;
    }
    if (relatedMemories.length > 0) {
      enhancedPrompt += `\n\n## 相关记忆\n${relatedMemories.map((m: { content: string }) => `- ${m.content}`).join('\n')}`;
    }

    let convId = conversationId;
    let allMessages: { role: string; content: string }[] = [];

    if (convId) {
      const msgs = getMessages(convId) as any[];
      allMessages = msgs.map((m: any) => ({ role: m.role, content: m.content }));
    } else {
      const newConv = createConversation(avatarId) as any;
      convId = newConv?.id;
    }

    const recentMessages = allMessages.slice(-10);
    const llmSystemPrompt = enhancedPrompt;

    let userMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...recentMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const currentTurn = Math.floor(allMessages.length / 2) + 1;
    if (currentTurn > 0 && currentTurn % 5 === 0) {
      const coreValues = characterCard?.core_identity?.core_values?.join('、') || '温柔、善良';
      const anchor = `【系统提醒】你现在是${avatar.name}。记住你的核心特质：${coreValues}。保持你的说话风格，像你平时那样说话。`;
      userMessages.splice(-2, 0, { role: 'user' as const, content: anchor });
      userMessages.splice(-1, 0, { role: 'assistant' as const, content: `好的，我记住了。我会继续做${avatar.name}。` });
    }

    let stream;
    if (config.mode === 'local') {
      stream = await ollamaStreamChatWrapper(userMessages, llmSystemPrompt);
    } else {
      stream = await streamChat({
        systemPrompt: llmSystemPrompt,
        messages: userMessages,
        model: selectModel(),
      });
    }

    const emotionPromise = config.mode === 'local'
      ? Promise.resolve({
          primary_emotion: 'neutral' as const,
          intensity: 0.1,
          suggested_tone: '自然',
          tts_stability: 0.6,
          is_deep_emotional: false,
        })
      : analyzeEmotion(message, allMessages.slice(-4));

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          stream.on('text', (text: string) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });

          await stream.finalMessage();

          const emotionResult = await emotionPromise;
          const taggedResponse = addAIIdentifier(fullResponse);

          if (convId) {
            addMessage(convId, 'user', message);
            addMessage(convId, 'assistant', taggedResponse);
            extractMemoryInBackground(message, fullResponse, avatarId, avatar.name);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'emotion',
            emotion: emotionResult.primary_emotion,
            tts_stability: emotionResult.tts_stability,
            suggested_tone: emotionResult.suggested_tone,
          })}\n\n`));

          if (safety.isSelfHarm) {
            const isZh = (message.charCodeAt(0) > 0x4E00);
            const crisisMsg = isZh
              ? '\n\n---\n💡 如果你正在经历困难时刻，请知道你并不孤单。\n- 24小时心理援助热线：400-161-9995\n- 生命热线：400-821-1215\n也可以和身边信任的人聊聊。'
              : '\n\n---\n💡 If you\'re going through a difficult time, you\'re not alone.\n- Crisis Lifeline: 988 (US) / 116 123 (UK)\n- Crisis Text Line: Text HOME to 741741';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'self_harm_support',
              message: crisisMsg,
            })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: '生成回复失败' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

async function extractMemoryInBackground(
  userMessage: string,
  avatarResponse: string,
  avatarId: string,
  avatarName: string
) {
  try {
    const memory = await extractMemory(userMessage, avatarResponse, avatarName);
    if (!memory) return;

    const config = getAppConfig();
    const embeddingMod = getEmbeddingProvider(config);
    const embedFn = config.embedding.provider === 'local'
      ? embeddingMod.localGenerateEmbedding
      : generateEmbedding;

    const dedupEmbedding = await embedFn(memory.content);

    const existing = getMemories(avatarId) as any[];
    const isDuplicate = existing.some((m) => {
      if (!m.embedding) return false;
      return cosineSimilarity(dedupEmbedding, m.embedding) > 0.92;
    });

    if (isDuplicate) {
      console.log(`Memory dedup: skipping similar memory`);
      return;
    }

    createMemory({
      avatar_id: avatarId,
      content: memory.content,
      source: 'auto_extract',
      type: memory.memory_type || 'conversation',
      importance: Math.round(memory.confidence * 10),
      embedding: dedupEmbedding,
    });
  } catch (err) {
    console.error('Memory extraction error:', err);
  }
}
