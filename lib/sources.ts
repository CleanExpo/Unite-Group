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

// Last-resort extraction: when the researcher wrote prose instead of the
// numbered list, harvest every URL with its surrounding sentence so a flaky
// model still yields usable sources instead of a skipped channel.
export function harvestSources(text: string): WebSource[] {
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s)\]>"']+/g)) {
    const url = match[0].replace(/[.,;)\]]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    const start = text.lastIndexOf("\n", match.index ?? 0) + 1;
    const lineEnd = text.indexOf("\n", match.index ?? 0);
    const line = text.slice(start, lineEnd === -1 ? undefined : lineEnd);
    const context = line.replace(match[0], "").replace(/[|\\—–\-:()[\]*#]+/g, " ").trim();
    sources.push({
      title: context.slice(0, 120) || url,
      url,
      excerpt: context,
    });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}
