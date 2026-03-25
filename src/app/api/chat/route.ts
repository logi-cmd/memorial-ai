import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
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
import type { EmotionTurn } from '@/lib/supabase';
import { evolveCharacterCard, applyEvolutionPatch } from '@/lib/evolution';
import { shouldGenerateProactive, generateProactiveMessage } from '@/lib/proactive';
import { containsSensitiveContent, checkRateLimit, addAIIdentifier } from '@/lib/content-safety';

interface ChatRequestBody {
  avatarId: string;
  userId: string;
  message: string;
  conversationId?: string;
}

// POST /api/chat - 对话接口（流式返回）
export async function POST(request: NextRequest) {
  try {
    const { avatarId, userId, message, conversationId } = (await request.json()) as ChatRequestBody;

    if (!avatarId || !message) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 通过 SSR client 验证用户身份
    const serverSupabase = await createSupabaseServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    const authenticatedUserId = user?.id;
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Content safety check
    const safety = containsSensitiveContent(message);
    if (safety.isSensitive) {
      return NextResponse.json(
        { error: '该消息包含不适当内容，请修改后重试' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(authenticatedUserId);
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      );
    }

    // 1. 获取分身信息
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatarId)
      .single();

    if (avatarError || !avatar) {
      return NextResponse.json({ error: '分身不存在' }, { status: 404 });
    }

    // 2. 检索相关记忆（加权 RAG）
    const queryEmbedding = await generateEmbedding(message);
    const { data: relevantMemories } = await supabase.rpc('match_memories_weighted', {
      query_embedding: queryEmbedding,
      target_avatar_id: avatarId,
      match_threshold: 0.55,
      match_count: 7,
    });

    // 将记忆按类型分组
    const importantMemories = (relevantMemories || [])
      .filter((m: Record<string, unknown>) => m.memory_type === 'core_identity')
      .map((m: Record<string, unknown>) => ({ content: m.content as string, id: m.id as string }));
    const relatedMemories = (relevantMemories || [])
      .filter((m: Record<string, unknown>) => m.memory_type !== 'core_identity')
      .map((m: Record<string, unknown>) => ({ content: m.content as string, id: m.id as string }));

    // 异步更新被检索记忆的 access_count
    for (const m of relevantMemories || []) {
      supabase.rpc('increment_memory_access', { memory_id: (m as Record<string, unknown>).id }).then(() => {});
    }

    // 3. 构建增强型 System Prompt
    const styleProfile = avatar.profile as StyleProfile | null;
    const characterCard = avatar.character_card as CharacterCard | null;
    let enhancedPrompt: string;

    if (characterCard) {
      // P1 新格式：从结构化 CharacterCard 渲染
      enhancedPrompt = renderCharacterPrompt(characterCard, styleProfile ?? undefined);
    } else {
      // 旧格式兼容：system_prompt + 风格注入
      enhancedPrompt = avatar.system_prompt || `你是${avatar.name}，${avatar.relationship}。`;

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

    // 注入记忆
    if (importantMemories.length > 0) {
      enhancedPrompt += `\n\n## 核心身份记忆\n${importantMemories.map((m: { content: string }) => `- ${m.content}`).join('\n')}`;
    }
    if (relatedMemories.length > 0) {
      enhancedPrompt += `\n\n## 相关记忆\n${relatedMemories.map((m: { content: string }) => `- ${m.content}`).join('\n')}`;
    }

    // 4. 获取或创建对话（完整消息 + 摘要）
    let convId = conversationId;
    let allMessages: { role: string; content: string }[] = [];
    let lastSummary: ConversationSummaryData | null = null;
    let lastSummaryTurn = 0;
    let emotionTrajectory: EmotionTurn[] = [];

    if (convId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('messages, summary, last_summary_turn, turn_count, emotion_trajectory')
        .eq('id', convId)
        .single();
      if (conversation) {
        allMessages = conversation.messages || [];
        lastSummary = conversation.summary as ConversationSummaryData | null;
        lastSummaryTurn = conversation.last_summary_turn || 0;
        emotionTrajectory = (conversation.emotion_trajectory as EmotionTurn[]) || [];
      }
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          avatar_id: avatarId,
          user_id: authenticatedUserId,
          turn_count: 0,
          last_summary_turn: 0,
          emotion_trajectory: [],
        })
        .select()
        .single();
      convId = newConv?.id;
    }

    // 5. 构建 LLM 消息上下文（摘要 + 最近消息）
    const recentMessages = allMessages.slice(-10);
    const summaryContext = lastSummary
      ? `\n\n## 对话历史摘要\n${lastSummary.summary_text}\n此前讨论过的话题：${lastSummary.topics.join('、')}\n已知的关于${avatar.name}的信息：${lastSummary.new_info.join('；')}`
      : '';

    const llmSystemPrompt = enhancedPrompt + summaryContext;

    // 每 5 轮注入人格锚定
    let userMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...recentMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const currentTurn = Math.floor(allMessages.length / 2) + 1;
    if (currentTurn > 0 && currentTurn % 5 === 0) {
      const coreValues = characterCard?.core_identity?.core_values?.join('、')
        || (avatar.system_prompt ? '' : '温柔、善良');
      const anchor = `【系统提醒】你现在是${avatar.name}。记住你的核心特质：${coreValues}。保持你的说话风格，像你平时那样说话。`;
      userMessages.splice(-2, 0, { role: 'user' as const, content: anchor });
      userMessages.splice(-1, 0, { role: 'assistant' as const, content: `好的，我记住了。我会继续做${avatar.name}。` });
    }

    // 6. 流式对话
    const stream = await streamChat({
      systemPrompt: llmSystemPrompt,
      messages: userMessages,
      model: selectModel(),
    });

    // 7. 异步情感分析（不阻塞流式启动）
    const emotionPromise = analyzeEmotion(message, allMessages.slice(-4));

    // 8. 创建流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          stream.on('text', (text) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });

          await stream.finalMessage();

          // 9. 获取情感分析结果
          const emotionResult = await emotionPromise;

          // 10. 保存对话记录（全量保留，不再截断）
          const turnNum = Math.floor(allMessages.length / 2) + 1;
          const taggedResponse = addAIIdentifier(fullResponse);
          const updatedAllMessages = [
            ...allMessages,
            { role: 'user', content: message },
            { role: 'assistant', content: taggedResponse },
          ];

          // 追加情感轨迹
          const newEmotionTurn: EmotionTurn = {
            turn: turnNum,
            user_text: message,
            emotion: emotionResult.primary_emotion,
            intensity: emotionResult.intensity,
            timestamp: new Date().toISOString(),
          };
          const updatedTrajectory = [...emotionTrajectory, newEmotionTurn];

          // 每 10 轮生成摘要
          const shouldSummarize = turnNum - lastSummaryTurn >= 10;
          let newSummary: ConversationSummaryData | null = lastSummary;

          if (shouldSummarize) {
            const messagesToSummarize = updatedAllMessages.slice(lastSummaryTurn * 2);
            newSummary = await generateConversationSummary(messagesToSummarize, avatar.name);

            // 将摘要中的新信息存为 autobiographical 记忆
            if (newSummary && newSummary.new_info.length > 0) {
              for (const info of newSummary.new_info) {
                const infoEmbedding = await generateEmbedding(info);
                const { data: similar } = await supabase.rpc('find_similar_memory', {
                  check_embedding: infoEmbedding,
                  target_avatar_id: avatarId,
                  similarity_threshold: 0.92,
                });
                if (!similar || similar.length === 0) {
                  await supabase.from('memories').insert({
                    avatar_id: avatarId,
                    content: info,
                    source: 'auto_extract',
                    importance: 6,
                    confirmed: true,
                    memory_type: 'autobiographical',
                    embedding: infoEmbedding,
                    confidence_score: 0.85,
                    metadata: { topic: 'conversation_summary' },
                  });
                }
              }
            }

            // 人格演化检查（在摘要生成后异步执行）
            if (characterCard && newSummary) {
              const recentInfo = newSummary.new_info.slice(0, 5);
              if (recentInfo.length > 0) {
                const evolutionResult = await evolveCharacterCard(
                  characterCard as unknown as Record<string, unknown>,
                  newSummary.summary_text,
                  recentInfo
                );
                if (evolutionResult.should_apply && evolutionResult.patches.length > 0) {
                  const newCard = applyEvolutionPatch(characterCard as unknown as Record<string, unknown>, evolutionResult.patches);
                  await supabase.from('avatars').update({
                    character_card: newCard,
                    evolution_version: (avatar.evolution_version || 1) + 1,
                  }).eq('id', avatarId);
                  await supabase.from('character_card_history').insert({
                    avatar_id: avatarId,
                    version: (avatar.evolution_version || 1) + 1,
                    patches: evolutionResult.patches,
                    character_card: newCard,
                    significance: evolutionResult.significance,
                  });
                }
              }
            }

            // 主动消息检查（在摘要生成后异步执行）
            if (newSummary && shouldSummarize) {
              const recentMems = (relevantMemories || []).slice(0, 5).map((m: Record<string, unknown>) => ({
                content: m.content as string,
                importance: (m.importance as number) || 5,
                memory_type: (m.memory_type as string) || 'conversation',
              }));
              const proactiveCheck = await shouldGenerateProactive(
                avatar.name,
                newSummary.summary_text,
                recentMems
              );
              if (proactiveCheck.should) {
                const msg = await generateProactiveMessage(
                  avatar.name,
                  proactiveCheck.type,
                  newSummary.summary_text
                );
                await supabase.from('proactive_messages').insert({
                  avatar_id: avatarId,
                  type: proactiveCheck.type,
                  title: msg.title,
                  content: msg.content,
                });
              }
            }
          }
          if (convId) {
            await supabase
              .from('conversations')
              .update({
                messages: updatedAllMessages,
                turn_count: turnNum,
                last_summary_turn: shouldSummarize ? turnNum : lastSummaryTurn,
                summary: newSummary,
                emotion_summary: emotionResult.primary_emotion,
                emotion_trajectory: updatedTrajectory,
              })
              .eq('id', convId);
          }

          // 11. 异步提取新记忆（被动教导）
          extractMemoryInBackground(message, fullResponse, avatarId, avatar.name);

          // 12. 发送情感事件给前端
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'emotion',
            emotion: emotionResult.primary_emotion,
            tts_stability: emotionResult.tts_stability,
            suggested_tone: emotionResult.suggested_tone,
          })}\n\n`));

          // 13. Self-harm check: send crisis resources alongside normal response
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

// 异步提取记忆（不阻塞响应）
async function extractMemoryInBackground(
  userMessage: string,
  avatarResponse: string,
  avatarId: string,
  avatarName: string
) {
  try {
    const memory = await extractMemory(userMessage, avatarResponse, avatarName);
    if (!memory) return;

    // 检查去重
    const dedupEmbedding = await generateEmbedding(memory.content);
    const { data: similar } = await supabase.rpc('find_similar_memory', {
      check_embedding: dedupEmbedding,
      target_avatar_id: avatarId,
      similarity_threshold: 0.92,
    });

    if (similar && similar.length > 0) {
      console.log(`Memory dedup: skipping, similar to ${similar[0].id}`);
      return;
    }

    await supabase.from('memories').insert({
      avatar_id: avatarId,
      content: memory.content,
      source: 'auto_extract',
      importance: Math.round(memory.confidence * 10),
      confirmed: false,
      confidence_score: memory.confidence,
      memory_type: memory.memory_type,
      emotion_type: memory.emotion_type,
      embedding: dedupEmbedding,
      metadata: { topic: memory.topic, confidence: memory.confidence },
    });
  } catch (err) {
    console.error('Memory extraction error:', err);
  }
}
