import { NextRequest, NextResponse } from 'next/server';
import { updateAvatar, createMemory } from '@/lib/db';
import { getAppConfig } from '@/lib/providers/config';
import { getLLMProvider, getEmbeddingProvider } from '@/lib/providers';

export async function POST(request: NextRequest) {
  try {
    const { avatarId, chatHistory } = await request.json();

    if (!avatarId || !chatHistory || typeof chatHistory !== 'string') {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const truncated = chatHistory.slice(0, 5000);
    const config = getAppConfig();

    const analysisPrompt = `你是一位语言风格分析专家。请从以下聊天记录中提取说话人的风格特征。

聊天记录：
${truncated}

请以 JSON 格式输出以下信息（不要用 markdown 代码块，直接输出 JSON）：

{
  "catchphrases": ["口头禅1", "口头禅2", "口头禅3"],
  "sentence_features": ["短句为主", "喜欢用反问句", "常用省略号结尾"],
  "tone_words": {
    "开心": ["哈哈", "太好啦", "开心"],
    "安慰": ["没事没事", "别担心", "都会好的"],
    "生气": ["真的", "太过分了"],
    "日常": ["嗯", "好", "行"]
  },
  "humor_style": "描述幽默风格",
  "topic_preferences": {
    "avoid": ["政治", "金钱"],
    "active": ["食物", "家人", "天气"]
  },
  "example_exchanges": [
    {"other": "对话者说了什么", "self": "这个人怎么回复的（选3-5段最典型的）"}
  ],
  "speaking_summary": "一段话总结这个人的说话风格特点"
}`;

    let styleProfile;
    if (config.mode === 'local') {
      const llmMod = getLLMProvider(config);
      const response = await llmMod.ollamaGenerate(analysisPrompt);
      try {
        styleProfile = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          styleProfile = JSON.parse(jsonMatch[0]);
        }
      }
    } else {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: analysisPrompt }],
      });
      const text = response.content[0];
      const contentStr = typeof text === 'string' ? text : (text as { type: string; text: string }).text;
      try {
        styleProfile = JSON.parse(contentStr);
      } catch {
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          styleProfile = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!styleProfile) {
      return NextResponse.json({ error: '风格分析失败' }, { status: 500 });
    }

    updateAvatar(avatarId, { profile: styleProfile });

    if (styleProfile.example_exchanges?.length > 0) {
      const memoryContent = `说话风格样本（来自真实聊天记录）：
${styleProfile.example_exchanges.map((e: { self: string }) => `"${e.self}"`).join('\n')}
${styleProfile.speaking_summary || ''}`;

      const embeddingMod = getEmbeddingProvider(config);
      const embedding = await embeddingMod.localGenerateEmbedding(memoryContent);

      createMemory({
        avatar_id: avatarId,
        content: memoryContent,
        source: 'manual',
        type: 'conversation',
        importance: 9,
        embedding,
      });
    }

    return NextResponse.json({ styleProfile });
  } catch (err) {
    console.error('Calibrate error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
