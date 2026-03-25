import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding';

// GET /api/memories?avatarId=xxx - 获取分身的所有记忆
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .eq('avatar_id', avatarId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 分离已确认和待确认的记忆
  const confirmed = memories?.filter((m) => m.confirmed) || [];
  const pending = memories?.filter((m) => !m.confirmed) || [];

  return NextResponse.json({ confirmed, pending });
}

// POST /api/memories - 手动添加记忆
export async function POST(request: NextRequest) {
  try {
    const { avatarId, content, importance = 7 } = await request.json();

    if (!avatarId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const embedding = await generateEmbedding(content);

    const { data: memory, error } = await supabase
      .from('memories')
      .insert({
        avatar_id: avatarId,
        content,
        source: 'manual',
        importance,
        confirmed: true,
        embedding,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memory });
  } catch (err) {
    console.error('Add memory error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PATCH /api/memories - 确认/更新记忆
export async function PATCH(request: NextRequest) {
  const { memoryId, confirmed, content } = await request.json();

  if (!memoryId) {
    return NextResponse.json({ error: '缺少 memoryId' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (confirmed !== undefined) updateData.confirmed = confirmed;
  if (content) {
    updateData.content = content;
    // 重新生成嵌入
    const embedding = await generateEmbedding(content);
    updateData.embedding = embedding;
  }

  const { data: memory, error } = await supabase
    .from('memories')
    .update(updateData)
    .eq('id', memoryId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memory });
}

// DELETE /api/memories?memoryId=xxx - 删除记忆
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memoryId = searchParams.get('memoryId');

  if (!memoryId) {
    return NextResponse.json({ error: '缺少 memoryId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
