import { promises as fs } from 'node:fs';
import path from 'node:path';

interface KnowledgeChunk {
  id: string;
  source: string;
  text: string;
}

interface KnowledgeContext {
  chunks: KnowledgeChunk[];
}

export const KNOWLEDGE_FILES = [
  'README.md',
  'DOCUMENTATION.md',
  'DOCS_INDEX.md',
  'supabase_schema.sql',
  'prisma/schema.prisma',
  'docs/README.md',
  'docs/overview.md',
  'docs/quick-start.md',
  'docs/account-setup.md',
  'docs/opportunities.md',
  'docs/invoices.md',
  'docs/proposals.md',
  'docs/contracts.md',
  'docs/clients.md',
  'docs/templates.md',
  'docs/automation.md',
  'docs/integrations.md',
  'docs/reporting.md',
  'docs/api-reference.md',
  'docs/webhooks.md',
  'docs/troubleshooting.md',
  'docs/faq.md',
  'docs/support.md',
  'docs/GOOGLE_CALENDAR_SETUP.md',
  'docs/QUICKBOOKS_SETUP.md',
  'docs/AUTOPAY_IMPLEMENTATION.md',
  'docs/CALENDAR_INTEGRATION_GUIDE.md'
];

const MAX_CHUNK_CHARS = 1200;
const MAX_CONTEXT_CHUNKS = 6;
const META_SOURCES = new Set(['README.md', 'DOCUMENTATION.md', 'DOCS_INDEX.md', 'docs/README.md']);
const QUERY_OVERRIDES = [
  {
    pattern: /\b(getting started|quick start|quick-start)\b/i,
    sources: ['docs/overview.md']
  }
];

let cachedChunks: KnowledgeChunk[] | null = null;
let cachedFileStats: Record<string, number> | null = null;
let cachedSignature: string | null = null;

const headingPattern = /^#{1,6}\s+/;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);

const scoreChunk = (chunk: KnowledgeChunk, terms: string[]) => {
  const text = chunk.text.toLowerCase();
  const source = chunk.source.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (!term) continue;
    const inSource = source.includes(term);
    if (inSource) score += 2;

    const escaped = escapeRegExp(term);
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = text.match(regex);
    if (matches) score += matches.length;
  }

  return score;
};

const pickBestChunksForSources = (sources: string[], terms: string[]) => {
  const picks: KnowledgeChunk[] = [];

  for (const source of sources) {
    const candidates = (cachedChunks ?? []).filter((chunk) => chunk.source === source);
    if (!candidates.length) continue;
    const scored = candidates
      .map((chunk) => ({
        chunk,
        score: scoreChunk(chunk, terms)
      }))
      .sort((a, b) => b.score - a.score);
    picks.push(scored[0]?.chunk ?? candidates[0]);
  }

  return picks;
};

const chunkText = (text: string, source: string): KnowledgeChunk[] => {
  const lines = text.split(/\r?\n/);
  const chunks: KnowledgeChunk[] = [];
  let buffer = '';
  let currentHeading = '';

  const pushChunk = () => {
    const trimmed = normalizeWhitespace(buffer);
    if (!trimmed) return;
    chunks.push({
      id: `${source}#${chunks.length + 1}`,
      source,
      text: trimmed
    });
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (headingPattern.test(trimmedLine)) {
      pushChunk();
      currentHeading = trimmedLine;
      buffer = `${currentHeading}\n`;
      continue;
    }

    if (buffer.length + line.length + 1 > MAX_CHUNK_CHARS) {
      pushChunk();
      buffer = currentHeading ? `${currentHeading}\n` : '';
    }

    buffer += `${line}\n`;
  }

  pushChunk();
  return chunks;
};

const resolveFilePath = (filePath: string) => path.resolve(process.cwd(), filePath);

const readKnowledgeFiles = async () => {
  const fileStats: Record<string, number> = {};
  const chunks: KnowledgeChunk[] = [];

  await Promise.all(
    KNOWLEDGE_FILES.map(async (filePath) => {
      const absolutePath = resolveFilePath(filePath);
      try {
        const [stat, contents] = await Promise.all([
          fs.stat(absolutePath),
          fs.readFile(absolutePath, 'utf8')
        ]);
        fileStats[filePath] = stat.mtimeMs;
        const fileChunks = chunkText(contents, filePath);
        chunks.push(...fileChunks);
      } catch (error) {
        // Ignore missing files to keep the service resilient.
      }
    })
  );

  return { chunks, fileStats, signature: KNOWLEDGE_FILES.join('|') };
};

const isCacheValid = async () => {
  if (!cachedChunks || !cachedFileStats || !cachedSignature) return false;
  if (cachedSignature !== KNOWLEDGE_FILES.join('|')) return false;

  for (const filePath of KNOWLEDGE_FILES) {
    const absolutePath = resolveFilePath(filePath);
    try {
      const stat = await fs.stat(absolutePath);
      if (cachedFileStats[filePath] !== stat.mtimeMs) {
        return false;
      }
    } catch (error) {
      if (cachedFileStats[filePath]) return false;
    }
  }

  return true;
};

/**
 * Builds a lightweight knowledge context from docs, README, and schema files.
 */
export const getKnowledgeContext = async (query: string): Promise<KnowledgeContext> => {
  if (!(await isCacheValid())) {
    const { chunks, fileStats, signature } = await readKnowledgeFiles();
    cachedChunks = chunks;
    cachedFileStats = fileStats;
    cachedSignature = signature;
  }

  const terms = tokenize(query);
  const override = QUERY_OVERRIDES.find((entry) => entry.pattern.test(query));
  if (override) {
    return { chunks: pickBestChunksForSources(override.sources, terms) };
  }

  let scored = (cachedChunks ?? [])
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, terms)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.chunk);

  if (scored.some((chunk) => !META_SOURCES.has(chunk.source))) {
    scored = scored.filter((chunk) => !META_SOURCES.has(chunk.source));
  }

  scored = scored.slice(0, MAX_CONTEXT_CHUNKS);

  if (scored.length === 0) {
    const fallback = (cachedChunks ?? []).find(
      (chunk) => chunk.source === 'docs/README.md' || chunk.source === 'README.md',
    );
    return { chunks: fallback ? [fallback] : [] };
  }

  return { chunks: scored };
};

/**
 * Reads a whitelisted knowledge file, returning null if the file is not allowed or missing.
 */
export const readKnowledgeSource = async (sourcePath: string): Promise<string | null> => {
  if (!KNOWLEDGE_FILES.includes(sourcePath)) {
    return null;
  }

  try {
    const absolutePath = resolveFilePath(sourcePath);
    return await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    return null;
  }
};
