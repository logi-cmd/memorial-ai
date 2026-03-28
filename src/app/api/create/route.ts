import { NextRequest, NextResponse } from 'next/server';
import { getAvatarById, createAvatar, updateAvatar, createMemory } from '@/lib/db';
import { getAppConfig } from '@/lib/providers/config';
import { getLLMProvider, getEmbeddingProvider } from '@/lib/providers';
import { generateCharacterCard, renderCharacterPrompt } from '@/lib/claude';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const avatar = getAvatarById(avatarId);
  if (!avatar) {
    return NextResponse.json({ error: '分身不存在' }, { status: 404 });
  }

  return NextResponse.json({ avatar });
}

export async function POST(request: NextRequest) {
  try {
    const { name, relationship, keywords, description } = await request.json();

    if (!name || !relationship || !keywords) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const config = getAppConfig();

    let characterCard;
    if (config.mode === 'local') {
      const llmMod = getLLMProvider(config);
      const prompt = `你是一位语言风格分析专家。请根据以下信息，为 ${name} 生成结构化的 Character Card。

名字：${name}
与用户的关系：${relationship}
性格关键词：${keywords.join('、')}
${description ? `用户描述：${description}` : ''}

请输出 JSON 格式的人物卡片。`;
      const response = await llmMod.ollamaGenerate(prompt);
      try {
        characterCard = JSON.parse(response);
      } catch {
        characterCard = null;
      }
    }

    if (!characterCard) {
      characterCard = await generateCharacterCard({
        name,
        relationship,
        keywords,
        description,
      });
    }

    const systemPrompt = renderCharacterPrompt(characterCard);

    const avatar = createAvatar({
      name,
      relationship,
      character_card: characterCard,
    });

    const embeddingMod = getEmbeddingProvider(config);

    for (const kw of keywords) {
      const content = `${name}的特质：${kw}`;
      const embedding = await embeddingMod.localGenerateEmbedding(content);
      createMemory({
        avatar_id: (avatar as any).id,
        content,
        source: 'manual',
        type: 'conversation',
        importance: 7,
        embedding,
      });
    }

    return NextResponse.json({ avatar, systemPrompt });
  } catch (err) {
    console.error('Create avatar error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { avatarId, step, photoUrl, voiceId } = await request.json();

    if (!avatarId || !step) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { creation_step: step };
    if (photoUrl) updates.photo_url = photoUrl;
    if (voiceId) updates.voice_id = voiceId;

    const avatar = updateAvatar(avatarId, updates);
    return NextResponse.json({ avatar });
  } catch (err) {
    console.error('Update avatar error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
