// Pure parsing of web-researcher output — kept free of SDK/node imports so
// the test runner (and any client code) can use it directly.

export interface WebSource {
  title: string;
  url: string;
  excerpt: string;
}

export const MAX_SOURCES = 10;

// Parses the researcher's numbered "Title | URL | summary" lines, tolerating
// missing pipes by falling back to any numbered line that contains a URL.
export function parseSources(text: string): WebSource[] {
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    if (!/^\s*\d+[.)]/.test(line)) continue;
    let title: string | undefined;
    let url: string | undefined;
    let excerpt = "";
    const piped = line.match(/^\s*\d+[.)]\s*(.+?)\s*\|\s*(https?:\/\/[^\s|]+)\s*\|\s*(.+)$/);
    if (piped) {
      [, title, url, excerpt] = piped;
    } else {
      url = line.match(/https?:\/\/[^\s)\]"']+/)?.[0];
      if (!url) continue;
      title = line
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(url, "")
        .replace(/[|\\—–\-:()[\]]+/g, " ")
        .trim();
    }
    url = url.replace(/[.,;)\]]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: (title || url).trim(), url, excerpt: excerpt.trim() });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}
