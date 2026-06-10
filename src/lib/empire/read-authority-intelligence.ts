import { getAdminClient } from '@/lib/supabase/admin';

export interface AuthoritySignalDatum {
  id: string;
  title: string;
  status: 'draft-for-review' | 'active-7-day-pilot' | 'proposed-for-build' | 'unknown';
  source: 'wiki_pages' | 'seed';
  updatedAt: string | null;
  href: string;
}

export interface AuthorityIntelligenceResult {
  wrapperStatus: 'active' | 'draft' | 'missing';
  materialSignals: number;
  sourceErrorCount: number;
  assetsAwaitingReview: number;
  approvalGates: string[];
  nextRecommendedAction: string;
  signals: AuthoritySignalDatum[];
  fetchedAt: string;
}

const AUTHORITY_PAGE_IDS = [
  'authority-intelligence/nexus-authority-intelligence-wrapper-implementation-2026-06-09',
  'authority-intelligence/daily-opportunity-radar-pilot-implementation-2026-06-09',
  'authority-intelligence/daily-opportunity-radar-architecture-2026-06-09',
  'authority-intelligence/daily-opportunity-radar-source-registry-2026-06-09',
  'authority-intelligence/smb-trades-owner-target-profile-2026-06-09',
];

const DEFAULT_APPROVAL_GATES = [
  'No public publishing without approval',
  'No Reddit/community replies without approval',
  'No client contact or CRM overwrite without approval',
  'No spend, deployment, PR merge or legal/compliance claim without approval',
];

export async function readAuthorityIntelligence(): Promise<AuthorityIntelligenceResult | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('id, title, content, updated_at')
      .or(
        AUTHORITY_PAGE_IDS.map((id) => `id.eq.${id}`)
          .concat('id.like.authority-intelligence/opportunity-radar/daily/%')
          .join(','),
      )
      .order('updated_at', { ascending: false })
      .limit(24);

    if (error) return null;

    const rows = (data ?? []) as Array<{
      id?: string;
      title?: string | null;
      content?: string | null;
      updated_at?: string | null;
    }>;

    const wrapper = rows.find((row) => row.id === AUTHORITY_PAGE_IDS[0]);
    const pilot = rows.find((row) => row.id === AUTHORITY_PAGE_IDS[1]);
    const dailyRows = rows.filter((row) => row.id?.startsWith('authority-intelligence/opportunity-radar/daily/'));
    const materialSignals = countMaterialSignals(dailyRows.map((row) => row.content ?? '').join('\n'));
    const sourceErrorCount = countSourceErrors(rows.map((row) => row.content ?? '').join('\n'));
    const assetsAwaitingReview = rows.filter((row) => /status:\s*draft-for-review|approval_gate:/i.test(row.content ?? '')).length;

    const signals: AuthoritySignalDatum[] = rows.slice(0, 6).map((row) => ({
      id: row.id ?? 'unknown',
      title: row.title ?? titleFromId(row.id ?? 'unknown'),
      status: statusFromContent(row.content ?? ''),
      source: 'wiki_pages',
      updatedAt: row.updated_at ?? null,
      href: `/wiki?query=${encodeURIComponent(row.id ?? row.title ?? 'authority intelligence')}`,
    }));

    return {
      wrapperStatus: wrapper ? 'active' : pilot ? 'draft' : 'missing',
      materialSignals,
      sourceErrorCount,
      assetsAwaitingReview,
      approvalGates: DEFAULT_APPROVAL_GATES,
      nextRecommendedAction: wrapper
        ? 'Use the Nexus Authority Intelligence Wrapper on every new research, content, community, recommendation, sector or product-enhancement task.'
        : 'Create the Nexus Authority Intelligence Wrapper before expanding specialist workflows.',
      signals,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function countMaterialSignals(content: string): number {
  const matches = content.match(/material signal\(s\)|\|\s*\d+\s*\|/gi);
  return matches?.length ?? 0;
}

function countSourceErrors(content: string): number {
  return (content.match(/HTTPError|timeout|fetch errors/gi) ?? []).length;
}

function statusFromContent(content: string): AuthoritySignalDatum['status'] {
  if (/status:\s*active-7-day-pilot/i.test(content)) return 'active-7-day-pilot';
  if (/status:\s*draft-for-review/i.test(content)) return 'draft-for-review';
  if (/status:\s*proposed-for-build/i.test(content)) return 'proposed-for-build';
  return 'unknown';
}

function titleFromId(id: string): string {
  return id
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? 'Authority Intelligence';
}
