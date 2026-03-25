import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/profile/calibrate - 从聊天记录中提取说话风格
export async function POST(request: NextRequest) {
  try {
    const { avatarId, chatHistory } = await request.json();

    if (!avatarId || !chatHistory || typeof chatHistory !== 'string') {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 限制输入长度（约 5000 字）
    const truncated = chatHistory.slice(0, 5000);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-3-5-20241022',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `你是一位语言风格分析专家。请从以下聊天记录中提取说话人的风格特征。

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
  "humor_style": "描述幽默风格（如：轻微自嘲、冷幽默、爱开玩笑）",
  "topic_preferences": {
    "avoid": ["政治", "金钱"],
    "active": ["食物", "家人", "天气"]
  },
  "example_exchanges": [
    {"other": "对话者说了什么", "self": "这个人怎么回复的（选3-5段最典型的）"},
    {"other": "", "self": ""}
  ],
  "speaking_summary": "一段话总结这个人的说话风格特点"
}

注意：
- catchphrases 提取 3-8 个最常用的口头禅/语气词
- example_exchanges 选择 3-5 段最能体现说话风格的对话
- 如果聊天记录太短或信息不足，可以在对应字段填 null`,
        },
      ],
    });

    const text = response.content[0];
    const contentStr = typeof text === 'string' ? text : (text as { type: string; text: string }).text;

    let styleProfile;
    try {
      styleProfile = JSON.parse(contentStr);
    } catch {
      // 如果 JSON 解析失败，尝试提取
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        styleProfile = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: '风格分析失败' }, { status: 500 });
      }
    }

    // 更新分身的 profile 字段
    const { data: avatar, error } = await supabase
      .from('avatars')
      .update({
        profile: styleProfile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', avatarId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    // 将风格样本作为核心身份记忆存入
    if (styleProfile.example_exchanges?.length > 0) {
      const memoryContent = `说话风格样本（来自真实聊天记录）：
${styleProfile.example_exchanges.map((e: { self: string }) => `"${e.self}"`).join('\n')}
${styleProfile.speaking_summary || ''}`;

      // 使用动态导入避免循环依赖
      const { generateEmbedding } = await import('@/lib/embedding');
      const embedding = await generateEmbedding(memoryContent);

      await supabase.from('memories').insert({
        avatar_id: avatarId,
        content: memoryContent,
        source: 'manual',
        importance: 9,
        confirmed: true,
        memory_type: 'core_identity',
        embedding,
        metadata: { type: 'style_samples', summary: styleProfile.speaking_summary },
      });
    }

    return NextResponse.json({
      styleProfile,
      avatar,
    });
  } catch (err) {
    console.error('Calibrate error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
