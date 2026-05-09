export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

interface Artefact {
  filename: string;
  title: string;
  type: string;       // 'positioning' | 'content-calendar' | 'email-sequence' | 'seo-strategy' | 'case-study' | 'other'
  preview: string;    // first 200 chars of content
  date: string;       // from filename
}

function classifyArtefact(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes('position')) return 'positioning';
  if (f.includes('calendar')) return 'content-calendar';
  if (f.includes('email') || f.includes('sequence')) return 'email-sequence';
  if (f.includes('seo') || f.includes('keyword')) return 'seo-strategy';
  if (f.includes('case-study') || f.includes('case_study')) return 'case-study';
  if (f.includes('landing')) return 'landing-page';
  if (f.includes('icp') || f.includes('research')) return 'research';
  return 'other';
}

function extractTitle(content: string, filename: string): string {
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) return h1[1].trim().slice(0, 80);
  return filename.replace(/[-_]/g, ' ').replace(/\d{4}-\d{2}-\d{2}/, '').replace(/\.md$/, '').trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientSlug = url.searchParams.get('client') ?? 'ccw';

  // Map client slug to harness artefacts folder
  const FOLDER_MAP: Record<string, string> = {
    'ccw': 'ccw',
    'ccw-crm': 'ccw',
  };
  const folder = FOLDER_MAP[clientSlug] ?? clientSlug;

  const artefactsDir = join(os.homedir(), 'Pi-CEO/Pi-Dev-Ops/.harness/artefacts', folder);

  try {
    const files = (await readdir(artefactsDir)).filter(f => f.endsWith('.md')).sort().reverse();

    const artefacts: Artefact[] = await Promise.all(
      files.slice(0, 8).map(async (file) => {
        const content = await readFile(join(artefactsDir, file), 'utf-8');
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        return {
          filename: file,
          title: extractTitle(content, file),
          type: classifyArtefact(file),
          preview: content.replace(/^#.+\n/m, '').replace(/\n+/g, ' ').trim().slice(0, 200),
          date: dateMatch?.[1] ?? 'recent',
        };
      })
    );

    return NextResponse.json({ artefacts, folder, count: artefacts.length });
  } catch {
    return NextResponse.json({ artefacts: [], folder, count: 0, error: 'No artefacts found for this client' });
  }
}
