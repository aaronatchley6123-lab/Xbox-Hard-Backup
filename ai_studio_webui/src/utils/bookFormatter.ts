export interface BookChapter {
  id: string;
  title: string;
  startPage: number; // 1-indexed
  endPage: number;
  charOffset: number;
  charLength: number;
}

export interface BookPage {
  pageNumber: number; // 1-indexed
  chapterId: string;
  chapterTitle: string;
  text: string;
  charStart: number;
  charEnd: number;
  wordCount: number;
}

export interface ParsedBook {
  pages: BookPage[];
  chapters: BookChapter[];
  totalChars: number;
  totalWords: number;
  estimatedTokens: number;
}

export type TrainingFormat = 'openai' | 'sharegpt' | 'alpaca' | 'raw_pretrain';

export interface CorpusSourceDocument {
  id: string;
  title: string;
  sourceLabel: string;
  category?: string;
  text: string;
  structuredAppendix?: string;
}

export interface TrainingCorpusResult {
  format: TrainingFormat;
  docCount: number;
  sampleCount: number;
  totalChars: number;
  estimatedTokens: number;
  previewSamples: any[];
  jsonl: string;
}

function countWords(s: string): number {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function detectHeadingLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 110) return null;
  // Markdown headings
  const md = /^#{1,3}\s+(.+)$/.exec(trimmed);
  if (md) return md[1].trim();
  // Explicit Chapter / Section / Part / Doc boundaries
  if (/^(?:chapter|section|part|appendix)\s+[0-9ivx]+(?:\s*[:.\-–—]\s*.+)?$/i.test(trimmed)) {
    return trimmed;
  }
  const docHdr = /^===\s*(.+?)\s*===$/.exec(trimmed) || /^\[Doc\s+\d+:\s*(.+?)\]$/.exec(trimmed);
  if (docHdr) return docHdr[1].trim();
  return null;
}

export function paginateBookContent(
  rawText: string,
  charsPerPage = 2000,
  fallbackChapterTitle = 'Full Document'
): ParsedBook {
  const cleanText = String(rawText || '').replace(/\r\n/g, '\n');
  const safePageChars = Math.max(600, Math.min(8000, charsPerPage));

  if (!cleanText.trim()) {
    return {
      pages: [
        {
          pageNumber: 1,
          chapterId: 'ch-1',
          chapterTitle: fallbackChapterTitle,
          text: '(Empty document — no printable text extracted.)',
          charStart: 0,
          charEnd: 0,
          wordCount: 0,
        },
      ],
      chapters: [
        {
          id: 'ch-1',
          title: fallbackChapterTitle,
          startPage: 1,
          endPage: 1,
          charOffset: 0,
          charLength: 0,
        },
      ],
      totalChars: 0,
      totalWords: 0,
      estimatedTokens: 0,
    };
  }

  // First split by explicit PDF form-feeds if present, preserving raw boundaries
  const hasFormFeeds = cleanText.includes('\f');
  const rawSegments: Array<{ titleHint?: string; text: string; offset: number }> = [];

  if (hasFormFeeds) {
    const ffParts = cleanText.split('\f');
    let offset = 0;
    ffParts.forEach((part, idx) => {
      const trimmed = part.trim();
      if (trimmed) {
        const firstLine = trimmed.split('\n')[0] || '';
        const heading = detectHeadingLine(firstLine);
        rawSegments.push({
          titleHint: heading || `Page ${idx + 1}`,
          text: part,
          offset,
        });
      }
      offset += part.length + 1;
    });
  } else {
    rawSegments.push({ titleHint: fallbackChapterTitle, text: cleanText, offset: 0 });
  }

  // Detect heading-based chapters inside text if no form-feeds or multi-section markdown
  const sections: Array<{ id: string; title: string; text: string; offset: number }> = [];

  if (!hasFormFeeds) {
    const lines = cleanText.split('\n');
    let currentTitle = fallbackChapterTitle;
    let currentLines: string[] = [];
    let sectionStart = 0;
    let cursor = 0;

    for (const line of lines) {
      const h = detectHeadingLine(line);
      if (h && currentLines.join('\n').trim().length > 180) {
        sections.push({
          id: `ch-${sections.length + 1}`,
          title: currentTitle,
          text: currentLines.join('\n'),
          offset: sectionStart,
        });
        currentTitle = h;
        currentLines = [line];
        sectionStart = cursor;
      } else {
        if (h && currentLines.length === 0) currentTitle = h;
        currentLines.push(line);
      }
      cursor += line.length + 1;
    }

    if (currentLines.length > 0) {
      sections.push({
        id: `ch-${sections.length + 1}`,
        title: currentTitle,
        text: currentLines.join('\n'),
        offset: sectionStart,
      });
    }
  } else {
    // Group form-feed pages into ~10-page chapters unless headings appear
    let groupTitle = rawSegments[0]?.titleHint || fallbackChapterTitle;
    let groupText = '';
    let groupOffset = 0;
    let countInGroup = 0;

    for (let i = 0; i < rawSegments.length; i++) {
      const seg = rawSegments[i];
      const heading = detectHeadingLine(seg.text.trim().split('\n')[0] || '');
      if (heading && groupText.trim().length > 0) {
        sections.push({
          id: `ch-${sections.length + 1}`,
          title: groupTitle,
          text: groupText,
          offset: groupOffset,
        });
        groupTitle = heading;
        groupText = seg.text;
        groupOffset = seg.offset;
        countInGroup = 1;
      } else {
        if (!groupText) {
          groupOffset = seg.offset;
          groupTitle = heading || `Pages ${i + 1}–${Math.min(rawSegments.length, i + 10)}`;
        }
        groupText += (groupText ? '\n\f\n' : '') + seg.text;
        countInGroup++;
        if (countInGroup >= 10) {
          sections.push({
            id: `ch-${sections.length + 1}`,
            title: groupTitle,
            text: groupText,
            offset: groupOffset,
          });
          groupText = '';
          countInGroup = 0;
        }
      }
    }
    if (groupText.trim()) {
      sections.push({
        id: `ch-${sections.length + 1}`,
        title: groupTitle,
        text: groupText,
        offset: groupOffset,
      });
    }
  }

  const pages: BookPage[] = [];
  const chapters: BookChapter[] = [];

  for (const sec of sections) {
    const startPage = pages.length + 1;
    const secText = sec.text.replace(/\f/g, '\n').trim();
    if (!secText) continue;

    // If section is still huge and has no chapters, break into clean pages along line boundaries
    let cursor = 0;
    while (cursor < secText.length) {
      let end = Math.min(secText.length, cursor + safePageChars);
      if (end < secText.length) {
        const paraBreak = secText.lastIndexOf('\n\n', end);
        const lineBreak = secText.lastIndexOf('\n', end);
        if (paraBreak > cursor + safePageChars * 0.55) {
          end = paraBreak + 2;
        } else if (lineBreak > cursor + safePageChars * 0.55) {
          end = lineBreak + 1;
        }
      }
      const chunk = secText.slice(cursor, end).trimEnd();
      if (chunk.trim()) {
        pages.push({
          pageNumber: pages.length + 1,
          chapterId: sec.id,
          chapterTitle: sec.title,
          text: chunk,
          charStart: sec.offset + cursor,
          charEnd: sec.offset + end,
          wordCount: countWords(chunk),
        });
      }
      cursor = end;
    }

    const endPage = pages.length;
    if (endPage >= startPage) {
      chapters.push({
        id: sec.id,
        title: sec.title,
        startPage,
        endPage,
        charOffset: sec.offset,
        charLength: secText.length,
      });
    }
  }

  // If only 1 giant chapter with many pages, create 10-page synthetic Table of Contents milestones for fast jumping
  const finalChapters: BookChapter[] =
    chapters.length === 1 && pages.length > 12
      ? Array.from({ length: Math.ceil(pages.length / 10) }, (_, idx) => {
          const sp = idx * 10 + 1;
          const ep = Math.min(pages.length, (idx + 1) * 10);
          return {
            id: `part-${idx + 1}`,
            title: `${chapters[0].title} · Pages ${sp}–${ep}`,
            startPage: sp,
            endPage: ep,
            charOffset: pages[sp - 1].charStart,
            charLength: pages[ep - 1].charEnd - pages[sp - 1].charStart,
          };
        })
      : chapters;

  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  return {
    pages,
    chapters: finalChapters,
    totalChars: cleanText.length,
    totalWords,
    estimatedTokens: Math.round(cleanText.length / 4),
  };
}

export function searchBookPages(
  pages: BookPage[],
  query: string
): Array<{ pageNumber: number; chapterTitle: string; snippet: string; matchCount: number }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Array<{ pageNumber: number; chapterTitle: string; snippet: string; matchCount: number }> = [];

  for (const p of pages) {
    const lower = p.text.toLowerCase();
    const firstIdx = lower.indexOf(q);
    if (firstIdx === -1) continue;
    let count = 0;
    let pos = firstIdx;
    while (pos !== -1) {
      count++;
      pos = lower.indexOf(q, pos + q.length);
    }
    const start = Math.max(0, firstIdx - 48);
    const snippet = p.text.slice(start, start + 140).replace(/\s+/g, ' ').trim();
    results.push({
      pageNumber: p.pageNumber,
      chapterTitle: p.chapterTitle,
      snippet,
      matchCount: count,
    });
  }
  return results;
}

export function buildTrainingCorpusClient(
  docs: CorpusSourceDocument[],
  options: {
    format: TrainingFormat;
    chunkChars: number;
    overlapChars: number;
    systemPrompt: string;
  }
): TrainingCorpusResult {
  const safeChunk = Math.max(400, Math.min(16000, options.chunkChars || 2400));
  const safeOverlap = Math.max(0, Math.min(Math.floor(safeChunk / 3), options.overlapChars || 250));
  const records: any[] = [];
  let totalChars = 0;

  for (const doc of docs) {
    const rawText = (doc.text || '').trim();
    const chunks: string[] = [];
    if (rawText) {
      let cursor = 0;
      while (cursor < rawText.length) {
        let end = Math.min(rawText.length, cursor + safeChunk);
        if (end < rawText.length) {
          const nl = rawText.lastIndexOf('\n', end);
          if (nl > cursor + safeChunk * 0.55) end = nl + 1;
        }
        const seg = rawText.slice(cursor, end).trim();
        if (seg) chunks.push(seg);
        if (end >= rawText.length) break;
        cursor = Math.max(cursor + 1, end - safeOverlap);
      }
    }

    const totalParts = Math.max(1, chunks.length);
    chunks.forEach((chunk, idx) => {
      totalChars += chunk.length;
      const partLabel = `Section ${idx + 1} of ${totalParts}`;
      const promptQ = `Explain and recall the exact contents of "${doc.title}" (${partLabel}${doc.category ? ` · ${doc.category}` : ''}).`;
      if (options.format === 'raw_pretrain') {
        records.push({
          text: `# ${doc.title} (${partLabel})\nSource: ${doc.sourceLabel}\n\n${chunk}`,
          source: doc.sourceLabel,
          title: doc.title,
          section: idx + 1,
          totalSections: totalParts,
        });
      } else if (options.format === 'alpaca') {
        records.push({
          instruction: promptQ,
          input: `Source: ${doc.sourceLabel}`,
          output: chunk,
        });
      } else if (options.format === 'sharegpt') {
        records.push({
          conversations: [
            { from: 'system', value: options.systemPrompt },
            { from: 'human', value: promptQ },
            { from: 'gpt', value: chunk },
          ],
        });
      } else {
        records.push({
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: promptQ },
            { role: 'assistant', content: chunk },
          ],
        });
      }
    });

    if (doc.structuredAppendix?.trim()) {
      const pinPrompt = `Provide the verified structured hardware/pinout appendix for "${doc.title}" (${doc.category || doc.sourceLabel}).`;
      if (options.format === 'raw_pretrain') {
        records.push({ text: `# ${doc.title} — Appendix\n\n${doc.structuredAppendix}`, source: doc.sourceLabel, title: doc.title });
      } else if (options.format === 'alpaca') {
        records.push({ instruction: pinPrompt, input: '', output: doc.structuredAppendix });
      } else if (options.format === 'sharegpt') {
        records.push({
          conversations: [
            { from: 'system', value: options.systemPrompt },
            { from: 'human', value: pinPrompt },
            { from: 'gpt', value: doc.structuredAppendix },
          ],
        });
      } else {
        records.push({
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: pinPrompt },
            { role: 'assistant', content: doc.structuredAppendix },
          ],
        });
      }
    }
  }

  return {
    format: options.format,
    docCount: docs.length,
    sampleCount: records.length,
    totalChars,
    estimatedTokens: Math.round(totalChars / 4),
    previewSamples: records.slice(0, 4),
    jsonl: records.map((r) => JSON.stringify(r)).join('\n'),
  };
}

export function buildOllamaModelfile(baseModel: string, title: string, summaryExcerpt: string): string {
  const safeExcerpt = summaryExcerpt.replace(/"""/g, "'''").slice(0, 6000);
  return [
    `FROM ${baseModel || 'qwen2.5:3b'}`,
    `PARAMETER temperature 0.2`,
    `PARAMETER num_ctx 8192`,
    `SYSTEM """`,
    `You are an offline domain assistant for ${title}.`,
    `Rely strictly on the ingested manuals, pinouts, logs, and datasets.`,
    safeExcerpt ? `\nKey Reference Index:\n${safeExcerpt}` : '',
    `"""`,
  ].join('\n');
}
