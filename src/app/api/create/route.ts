import { NextRequest, NextResponse } from 'next/server';
import { supabase, type Avatar } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateCharacterCard, renderCharacterPrompt } from '@/lib/claude';
import { generateEmbedding } from '@/lib/embedding';

// GET /api/create?avatarId=xxx - 获取分身信息
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const { data: avatar, error } = await supabase
    .from('avatars')
    .select('*')
    .eq('id', avatarId)
    .single();

  if (error || !avatar) {
    return NextResponse.json({ error: '分身不存在' }, { status: 404 });
  }

  return NextResponse.json({ avatar });
}

// POST /api/create - 创建新分身（Step 1: 基础信息 + 生成人格）
export async function POST(request: NextRequest) {
  try {
    const { name, relationship, keywords, description } = await request.json();

    if (!name || !relationship || !keywords) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 通过 SSR client 验证用户身份
    const serverSupabase = await createSupabaseServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // 生成结构化 Character Card + System Prompt（人格建模）
    const characterCard = await generateCharacterCard({
      name,
      relationship,
      keywords,
      description,
    });
    const systemPrompt = renderCharacterPrompt(characterCard);

    // 创建分身记录
    const { data: avatar, error } = await supabase
      .from('avatars')
      .insert({
        user_id: userId,
        name,
        relationship,
        profile: { keywords, description, character_card: characterCard },
        system_prompt: systemPrompt,
        character_card: characterCard,
        creation_step: 1,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `创建分身失败: ${error.message}` },
        { status: 500 }
      );
    }

    // 创建初始记忆（基于关键词）
    const initialMemories = keywords.map((kw: string) => ({
      avatar_id: avatar.id,
      content: `${name}的特质：${kw}`,
      source: 'manual' as const,
      importance: 7,
      confirmed: true,
    }));

    if (initialMemories.length > 0) {
      // 为初始记忆生成嵌入
      const texts = initialMemories.map((m: { content: string }) => m.content);
      const embeddings = await Promise.all(texts.map(generateEmbedding));

      const memoriesWithEmbeddings = initialMemories.map(
        (m: { avatar_id: string; content: string; source: 'manual'; importance: number; confirmed: boolean }, i: number) => ({
          ...m,
          embedding: embeddings[i],
        })
      );

      await supabase.from('memories').insert(memoriesWithEmbeddings);
    }

    return NextResponse.json({
      avatar,
      systemPrompt,
    });
  } catch (err) {
    console.error('Create avatar error:', err);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// PATCH /api/create - 更新分身信息（上传照片/语音等后续步骤）
export async function PATCH(request: NextRequest) {
  try {
    const { avatarId, step, photoUrl, voiceId } = await request.json();

    if (!avatarId || !step) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const updateData: Partial<Avatar> = {
      creation_step: step,
      updated_at: new Date().toISOString(),
    };

    if (photoUrl) updateData.photo_url = photoUrl;
    if (voiceId) updateData.voice_id = voiceId;

    const { data: avatar, error } = await supabase
      .from('avatars')
      .update(updateData)
      .eq('id', avatarId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `更新分身失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ avatar });
  } catch (err) {
    console.error('Update avatar error:', err);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
