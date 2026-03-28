import { NextRequest, NextResponse } from 'next/server';
import { getMemories } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');
  const type = searchParams.get('type');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const options: { confirmed?: boolean; type?: string; limit?: number } = { limit: 200 };
  if (type && type !== 'all') {
    if (type === 'pending') {
      options.confirmed = false;
    } else {
      options.type = type;
    }
  }

  const memories = getMemories(avatarId, options) as any[];

  const grouped: Record<string, any[]> = {};
  for (const m of memories) {
    const date = new Date(m.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return NextResponse.json({
    months: Object.entries(grouped).map(([month, items]) => ({ month, memories: items })),
    total: memories.length,
  });
}
