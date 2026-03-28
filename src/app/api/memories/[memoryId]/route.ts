import { NextRequest, NextResponse } from 'next/server';
import { confirmMemory, deleteMemory } from '@/lib/db';

interface RouteParams {
  params: Promise<{ memoryId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;

    const body = await request.json();
    const { confirmed } = body;
    if (typeof confirmed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body: confirmed must be boolean' }, { status: 400 });
    }

    if (confirmed) {
      confirmMemory(memoryId);
    }

    return NextResponse.json({ id: memoryId, confirmed });
  } catch (err) {
    console.error('Memory PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;
    deleteMemory(memoryId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Memory DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
