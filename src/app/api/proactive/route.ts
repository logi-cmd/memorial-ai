import { NextRequest, NextResponse } from 'next/server';
import { getAvatars, getProactiveMessages, createProactiveMessage, markProactiveSent } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    const avatars = getAvatars() as any[];
    if (avatars.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const allMessages: any[] = [];
    for (const a of avatars) {
      const msgs = getProactiveMessages(a.id) as any[];
      for (const m of msgs) {
        if (!m.sent) {
          allMessages.push(m);
        }
      }
    }
    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ messages: allMessages });
  }

  const messages = getProactiveMessages(avatarId) as any[];
  const unsent = messages.filter((m) => !m.sent);
  return NextResponse.json({ messages: unsent });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, messageId, avatarId, type, title, content } = body;

  if (action === 'mark_sent' && messageId) {
    markProactiveSent(messageId);
    return NextResponse.json({ success: true });
  }

  if (!avatarId || !content) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  createProactiveMessage(avatarId, type || 'general', content);
  return NextResponse.json({ success: true });
}
