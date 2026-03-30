import { NextRequest, NextResponse } from 'next/server';
import { processPublishQueue } from '@/lib/publish/publishQueue';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const itemIds: string[] | undefined = Array.isArray(body?.item_ids) ? body.item_ids : undefined;
    const result = await processPublishQueue(itemIds);
    return NextResponse.json(result);
  } catch (err) {
    console.error(JSON.stringify({ event: 'process_queue_error', error: err instanceof Error ? err.message : 'Unknown' }));
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
