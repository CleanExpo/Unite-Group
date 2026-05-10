import { NextRequest, NextResponse } from 'next/server';

const HERMES_URL = process.env.HERMES_API_URL || 'http://127.0.0.1:8642';
const HERMES_TIMEOUT_MS = 120_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const upstream = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(HERMES_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'Hermes upstream error', detail: text },
        { status: upstream.status }
      );
    }

    // Streaming: pipe through if the client requested SSE
    if (body.stream) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Hermes request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to reach Hermes API' }, { status: 502 });
  }
}

export async function GET() {
  try {
    const upstream = await fetch(`${HERMES_URL}/v1/models`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Hermes offline' }, { status: 502 });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Hermes offline' }, { status: 502 });
  }
}
