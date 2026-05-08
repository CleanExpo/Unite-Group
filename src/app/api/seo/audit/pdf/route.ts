import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Run the same audit logic inline (no import cycle)
async function runAudit(domain: string) {
  let html = '';
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Unite-Group SEO Audit/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch { /* ignore */ }

  function extract(pattern: RegExp): string {
    const m = html.match(pattern);
    return m ? (m[1] || m[2] || '').trim() : '';
  }

  const title = extract(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const description = extract(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)
                   || extract(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
  const ogTitle = extract(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i);
  const ogImage = extract(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']{1,400})["']/i);
  const canonical = extract(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']{1,400})["']/i);
  const robotsMeta = extract(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']{1,100})["']/i);
  const h1 = extract(/<h1[^>]*>([^<]{1,200})<\/h1>/i);

  let sitemapOk = false, robotsTxtOk = false;
  try {
    const [sm, rb] = await Promise.all([
      fetch(`https://${domain}/sitemap.xml`, { signal: AbortSignal.timeout(4000) }),
      fetch(`https://${domain}/robots.txt`, { signal: AbortSignal.timeout(4000) }),
    ]);
    sitemapOk = sm.ok; robotsTxtOk = rb.ok;
  } catch { /* ignore */ }

  void robotsTxtOk;

  const checks = {
    'Page Title':       { pass: title.length >= 20 && title.length <= 60,  value: title || 'Missing',       note: title.length ? `${title.length} chars (ideal 20–60)` : '⚠ Missing' },
    'Meta Description': { pass: description.length >= 70 && description.length <= 160, value: description || 'Missing', note: description.length ? `${description.length} chars (ideal 70–160)` : '⚠ Missing' },
    'OG Title':         { pass: ogTitle.length > 0,    value: ogTitle || 'Missing',    note: ogTitle ? '✓ Present' : '⚠ Missing — affects social sharing' },
    'OG Image':         { pass: ogImage.length > 0,    value: ogImage.length > 60 ? ogImage.slice(0, 60) + '…' : (ogImage || 'Missing'), note: ogImage ? '✓ Present' : '⚠ Missing — no social preview image' },
    'Canonical URL':    { pass: canonical.length > 0,  value: canonical || 'Missing',  note: canonical ? '✓ Present' : '⚠ Missing — duplicate content risk' },
    'H1 Heading':       { pass: h1.length > 0,         value: h1 || 'Missing',         note: h1 ? '✓ Present' : '⚠ Missing H1 tag' },
    'Robots Meta':      { pass: !robotsMeta.toLowerCase().includes('noindex'), value: robotsMeta || 'not set', note: robotsMeta.toLowerCase().includes('noindex') ? '✗ NOINDEX set' : '✓ Indexable' },
    'Sitemap':          { pass: sitemapOk,              value: sitemapOk ? `https://${domain}/sitemap.xml` : 'Not found', note: sitemapOk ? '✓ Accessible' : '⚠ /sitemap.xml not found' },
  };

  const passed = Object.values(checks).filter(c => c.pass).length;
  const score = Math.round((passed / Object.keys(checks).length) * 100);
  return { domain, score, passed, total: Object.keys(checks).length, checks, generatedAt: new Date().toISOString() };
}

function drawScoreGauge(doc: jsPDF, x: number, y: number, score: number) {
  const color = score >= 75 ? [22, 163, 74] : score >= 50 ? [217, 119, 6] : [220, 38, 38];
  const r = 18;
  // Background arc
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(3);
  doc.circle(x, y, r, 'S');
  // Score text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(String(score), x, y + 1, { align: 'center', baseline: 'middle' });
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('/ 100', x, y + 8, { align: 'center' });
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

  const audit = await runAudit(domain);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;

  // ── COVER PAGE ──────────────────────────────────────────────────────────
  // Dark background
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Unite Group header bar
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('UNITE GROUP', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Empire Command Center', 60, 12);
  doc.setTextColor(251, 191, 36);
  doc.text('CONFIDENTIAL', pageW - margin, 12, { align: 'right' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(250, 250, 250);
  doc.text('SEO AUDIT', margin, 55);
  doc.setFontSize(14);
  doc.setTextColor(164, 164, 181);
  doc.text('REPORT', margin, 67);

  // Domain
  doc.setFillColor(17, 17, 19);
  doc.roundedRect(margin, 78, pageW - margin * 2, 22, 3, 3, 'F');
  doc.setFontSize(16);
  doc.setTextColor(250, 250, 250);
  doc.setFont('courier', 'bold');
  doc.text(domain, pageW / 2, 92, { align: 'center' });

  // Score circle
  drawScoreGauge(doc, pageW / 2, 145, audit.score);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 115);
  doc.text('SEO SCORE', pageW / 2, 170, { align: 'center' });

  // Summary stats row
  const stats = [
    { label: 'Checks Passed', value: `${audit.passed}/${audit.total}` },
    { label: 'Score', value: `${audit.score}/100` },
    { label: 'Generated', value: new Date().toLocaleDateString('en-AU') },
  ];
  stats.forEach((s, i) => {
    const sx = margin + (i * (pageW - margin * 2) / 3) + ((pageW - margin * 2) / 6);
    doc.setFillColor(17, 17, 19);
    doc.roundedRect(sx - 20, 180, 40, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const color = audit.score >= 75 ? [22, 163, 74] : audit.score >= 50 ? [217, 119, 6] : [220, 38, 38];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(s.value, sx, 190, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(82, 82, 91);
    doc.text(s.label, sx, 196, { align: 'center' });
  });

  // Footer
  doc.setFillColor(17, 17, 19);
  doc.rect(0, pageH - 20, pageW, 20, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  doc.text('unite-group.in  ·  Powered by Unite Group Empire Command Center  ·  unite.app/seo', pageW / 2, pageH - 8, { align: 'center' });

  // ── PAGE 2: CHECKS TABLE ─────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Header bar
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('SEO AUDIT — DETAILED RESULTS', margin, 10);
  doc.setTextColor(164, 164, 181);
  doc.text(domain, pageW - margin, 10, { align: 'right' });

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(250, 250, 250);
  doc.text('Technical SEO Checks', margin, 30);

  const tableData = Object.entries(audit.checks).map(([check, data]) => [
    data.pass ? '✓' : '✗',
    check,
    data.value.length > 50 ? data.value.slice(0, 50) + '…' : data.value,
    data.note,
  ]);

  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin },
    head: [['', 'Check', 'Current Value', 'Assessment']],
    body: tableData,
    theme: 'plain',
    styles: {
      fillColor: [17, 17, 19],
      textColor: [212, 212, 216],
      fontSize: 8,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [27, 27, 30],
      textColor: [164, 164, 181],
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 70, textColor: [100, 100, 115] },
      3: { cellWidth: 50 },
    },
    didParseCell: (data) => {
      if (data.column.index === 0) {
        const val = String(data.cell.raw);
        data.cell.styles.textColor = val === '✓' ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    alternateRowStyles: { fillColor: [13, 13, 16] },
  });

  // Recommendations section
  const failedChecks = Object.entries(audit.checks).filter(([, c]) => !c.pass);
  if (failedChecks.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(250, 250, 250);
    doc.text('Priority Recommendations', margin, finalY + 16);

    failedChecks.forEach(([check, data], i) => {
      const ry = finalY + 26 + i * 14;
      if (ry > pageH - 25) return;
      doc.setFillColor(17, 17, 19);
      doc.roundedRect(margin, ry - 4, pageW - margin * 2, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text(`${i + 1}.`, margin + 3, ry + 3);
      doc.setTextColor(212, 212, 216);
      doc.text(check, margin + 10, ry + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 115);
      doc.text(data.note, margin + 55, ry + 3);
    });
  }

  // Footer p2
  doc.setFillColor(17, 17, 19);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(82, 82, 91);
  doc.text(`Generated by Unite Group CRM  ·  ${new Date().toISOString()}  ·  Page 2 of 2`, pageW / 2, pageH - 5, { align: 'center' });

  // Return PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_');
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="seo-audit-${safeDomain}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
