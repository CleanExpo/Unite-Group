/**
 * Deterministic text chunker for the AIW RAG corpus (the `/aiw` page content plus a
 * supplied services/pricing/FAQ set). Splits on paragraph boundaries and packs into
 * ~maxChars chunks, so a business's own words can be embedded and retrieved. Pure —
 * no external calls; embedding is a separate, keyed step.
 */
export interface CorpusChunk {
  index: number;
  text: string;
}

export function chunkCorpus(text: string, maxChars = 800): CorpusChunk[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';
  for (const para of paragraphs) {
    if (buffer && buffer.length + 1 + para.length > maxChars) {
      chunks.push(buffer);
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n${para}` : para;
    }
  }
  if (buffer) chunks.push(buffer);

  return chunks.map((chunk, index) => ({ index, text: chunk }));
}
