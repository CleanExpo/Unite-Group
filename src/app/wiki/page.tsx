'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { BookOpen, Search, ChevronRight, Clock, Tag } from 'lucide-react';

interface WikiPage {
  id: string;
  title: string;
  word_count: number;
  tags: string[];
  updated_at: string;
}

interface WikiPageFull extends WikiPage {
  content: string;
}

// ── Markdown renderer (no external deps) ────────────────────────────────────

function renderMarkdown(md: string, highlight?: string): string {
  let html = md
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Code blocks (before inline)
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold / italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Wiki links → plain text
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wl">$1</span>')
    // Regular links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr/>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs (double newline separated)
    .replace(/\n{2,}/g, '\n\n');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, m => `<ol>${m.replace(/<\/?oli>/g, s => s === '<oli>' ? '<li>' : '</li>')}</ol>`);

  // Wrap remaining plain text lines in <p>
  html = html.split('\n\n').map(block => {
    if (/^<[h1-6|ul|ol|pre|hr|blockquote]/.test(block.trim())) return block;
    if (!block.trim()) return '';
    return `<p>${block.trim()}</p>`;
  }).join('\n');

  // Highlight search term
  if (highlight) {
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  return html;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const BG      = '#09090b';
const CARD    = '#111113';
const BORDER  = '#27272a';
const MUTED   = '#52525b';
const TEXT    = '#fafafa';
const SUBDUED = '#a1a1aa';
const ACCENT  = '#3b82f6';

export default function WikiPage() {
  const router = useRouter();
  const [pages, setPages]       = useState<WikiPage[]>([]);
  const [active, setActive]     = useState<WikiPageFull | null>(null);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, [router]);

  // Load page list
  useEffect(() => {
    fetch('/api/wiki')
      .then(r => r.json())
      .then((data: WikiPage[]) => { setPages(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = pages.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  const openPage = useCallback((id: string) => {
    setPageLoading(true);
    setSidebarOpen(false);
    fetch(`/api/wiki?slug=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then((data: WikiPageFull) => { setActive(data); setPageLoading(false); })
      .catch(() => setPageLoading(false));
  }, []);

  // Auto-open first page
  useEffect(() => {
    if (!loading && pages.length > 0 && !active) openPage(pages[0].id);
  }, [loading, pages, active, openPage]);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', borderBottom: `1px solid ${BORDER}`,
        background: CARD, flexShrink: 0,
      }}>
        <BookOpen size={18} color={ACCENT} />
        <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' }}>
          2nd Brain — Knowledge Base
        </span>
        <div style={{ flex: 1 }} />
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(s => !s)}
          style={{
            display: 'none',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: SUBDUED, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
          }}
          className="sidebar-toggle"
        >
          Pages
        </button>
        <span style={{ fontSize: 11, color: MUTED }}>{pages.length} pages</span>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside
          className={`wiki-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 260, borderRight: `1px solid ${BORDER}`,
            background: CARD, display: 'flex', flexDirection: 'column',
            flexShrink: 0, overflowY: 'auto',
          }}
        >
          {/* Search */}
          <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: '6px 10px',
            }}>
              <Search size={13} color={MUTED} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter pages..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: TEXT, fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Page list */}
          <nav style={{ flex: 1, padding: '8px 6px' }}>
            {loading ? (
              <div style={{ padding: '20px 10px', color: MUTED, fontSize: 12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '20px 10px', color: MUTED, fontSize: 12 }}>No pages found</div>
            ) : (
              filtered.map(p => {
                const isActive = active?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => openPage(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                      borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                      transition: 'all 0.1s ease', marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1, fontSize: 12, color: isActive ? TEXT : SUBDUED, fontWeight: isActive ? 500 : 400, lineHeight: 1.4 }}>
                      {p.title}
                    </span>
                    {isActive && <ChevronRight size={11} color={ACCENT} />}
                  </button>
                );
              })
            )}
          </nav>
        </aside>

        {/* Content pane */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 860 }}>
          {pageLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <div style={{ width: 32, height: 32, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : active ? (
            <>
              {/* Page meta */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
                  {active.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
                    <Clock size={11} />
                    {active.word_count} words
                  </span>
                  {active.updated_at && (
                    <span style={{ fontSize: 11, color: MUTED }}>
                      Updated {new Date(active.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {active.tags?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Tag size={10} color={MUTED} />
                      {active.tags.slice(0, 5).map(t => (
                        <span key={t} style={{
                          fontSize: 10, padding: '2px 6px', background: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: BORDER, marginBottom: 28 }} />

              {/* Rendered content */}
              <div
                className="wiki-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content || '', search) }}
              />
            </>
          ) : (
            <div style={{ color: MUTED, fontSize: 13 }}>Select a page from the sidebar.</div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .wiki-content h1 { font-size: 22px; font-weight: 700; color: ${TEXT}; margin: 28px 0 10px; letter-spacing: -0.02em; }
        .wiki-content h2 { font-size: 18px; font-weight: 600; color: ${TEXT}; margin: 24px 0 8px; letter-spacing: -0.01em; }
        .wiki-content h3 { font-size: 15px; font-weight: 600; color: ${SUBDUED}; margin: 20px 0 6px; }
        .wiki-content h4 { font-size: 13px; font-weight: 600; color: ${MUTED}; margin: 16px 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .wiki-content p  { font-size: 14px; color: ${SUBDUED}; line-height: 1.75; margin: 0 0 14px; }
        .wiki-content ul { list-style: none; padding: 0; margin: 0 0 14px; }
        .wiki-content ul li { font-size: 14px; color: ${SUBDUED}; line-height: 1.7; padding: 2px 0 2px 16px; position: relative; }
        .wiki-content ul li::before { content: "·"; position: absolute; left: 4px; color: ${MUTED}; }
        .wiki-content ol { padding-left: 20px; margin: 0 0 14px; }
        .wiki-content ol li { font-size: 14px; color: ${SUBDUED}; line-height: 1.7; }
        .wiki-content pre { background: #0d0d0f; border: 1px solid ${BORDER}; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
        .wiki-content code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; color: #86efac; }
        .wiki-content pre code { color: #a3e635; }
        .wiki-content a { color: ${ACCENT}; text-decoration: none; }
        .wiki-content a:hover { text-decoration: underline; }
        .wiki-content strong { color: ${TEXT}; font-weight: 600; }
        .wiki-content em { color: ${SUBDUED}; font-style: italic; }
        .wiki-content hr { border: none; border-top: 1px solid ${BORDER}; margin: 24px 0; }
        .wiki-content blockquote { border-left: 3px solid ${ACCENT}; padding-left: 14px; margin: 14px 0; color: ${MUTED}; font-size: 14px; }
        .wiki-content .wl { color: #a78bfa; font-weight: 500; }
        .wiki-content mark { background: rgba(251,191,36,0.2); color: #fbbf24; border-radius: 2px; padding: 0 2px; }

        @media (max-width: 768px) {
          .sidebar-toggle { display: block !important; }
          .wiki-sidebar { position: fixed !important; top: 56px; left: 0; bottom: 0; z-index: 50; transform: translateX(-100%); transition: transform 0.2s ease; }
          .wiki-sidebar.open { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
