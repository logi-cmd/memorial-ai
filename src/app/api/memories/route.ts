import { NextRequest, NextResponse } from 'next/server';
import { getMemories, createMemory, deleteMemory } from '@/lib/db';
import { getAppConfig } from '@/lib/providers/config';
import { getEmbeddingProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const memories = getMemories(avatarId) as any[];

  const confirmed = memories.filter((m) => m.confirmed) || [];
  const pending = memories.filter((m) => !m.confirmed) || [];

  return NextResponse.json({ confirmed, pending });
}

export async function POST(request: NextRequest) {
  try {
    const { avatarId, content, importance = 7 } = await request.json();

    if (!avatarId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const config = getAppConfig();
    const embeddingMod = getEmbeddingProvider(config);
    const embedding = await embeddingMod.localGenerateEmbedding(content);

    const memory = createMemory({
      avatar_id: avatarId,
      content,
      source: 'manual',
      type: 'conversation',
      importance,
      embedding,
    });

    return NextResponse.json({ memory });
  } catch (err) {
    console.error('Add memory error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { memoryId, confirmed, content } = await request.json();

  if (!memoryId) {
    return NextResponse.json({ error: '缺少 memoryId' }, { status: 400 });
  }

  if (confirmed) {
    const { confirmMemory } = await import('@/lib/db');
    confirmMemory(memoryId);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memoryId = searchParams.get('memoryId');

  if (!memoryId) {
    return NextResponse.json({ error: '缺少 memoryId' }, { status: 400 });
  }

  deleteMemory(memoryId);
  return NextResponse.json({ success: true });
}
