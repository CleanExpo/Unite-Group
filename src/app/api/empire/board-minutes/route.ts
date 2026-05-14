export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { requireAdmin } from '@/lib/security/require-admin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const boardDir = join(os.homedir(), 'Pi-CEO/Pi-Dev-Ops/.harness/board-meetings');

  try {
    const files = (await readdir(boardDir))
      .filter(f => f.endsWith('-board-minutes.md'))
      .sort()
      .reverse()
      .slice(0, 3);

    const minutes = await Promise.all(files.map(async (file) => {
      const content = await readFile(join(boardDir, file), 'utf-8');
      const date = file.replace('-board-minutes.md', '');

      // Extract topic and decision from markdown
      const topicMatch = content.match(/(?:Topic:|Brief:|##?\s+(?:Topic|Brief)):?\s*(.+)/i);
      const decisionMatch = content.match(/(?:DECISION|Decision|Approved|Directive):?\s*(.{20,200})/i);
      const directiveMatch = content.match(/(?:DIRECTIVE ISSUED TO|Directive to):?\s*(.+)/i);

      return {
        date,
        topic: topicMatch?.[1]?.trim().slice(0, 100) ?? 'Board deliberation',
        decision: decisionMatch?.[1]?.trim().slice(0, 200) ?? 'See full minutes',
        directiveTo: directiveMatch?.[1]?.trim().slice(0, 50) ?? null,
        preview: content.slice(0, 300),
      };
    }));

    return NextResponse.json({ minutes });
  } catch {
    return NextResponse.json({ minutes: [], error: 'Board minutes directory not accessible' });
  }
}
