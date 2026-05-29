import { saveWikiPage, updateWikiIndex, appendWikiLog, readWikiIndex, listWikiPages, batchWriteWikiPages, getSchema, maintainBacklinks } from './wikiStore.js';
import { storeRawSource, getRawSource } from './rawVault.js';
import { LLMClient } from '../shared/llm-client.js';
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';

const INGEST_PROMPT_TEMPLATE = `## Current Wiki Index
{indexMd}

## Existing Entities
{existingEntityTitles}

## New Source
Filename: {filename}
Format: {ext}
Text:
{rawText}

Please process this source and integrate it into the wiki. Return ONLY a JSON object with this exact shape:
{{
  "sourcePage": {{
    "title": "string",
    "content": "markdown string with YAML frontmatter"
  }},
  "entityPages": [
    {{ "title": "string", "content": "markdown string with YAML frontmatter" }}
  ],
  "conceptPages": [
    {{ "title": "string", "content": "markdown string with YAML frontmatter" }}
  ],
  "updatedIndex": "full markdown string of the updated index.md",
  "logEntry": "one-line description for the log"
}}

Rules:
- Update existing entity pages if the source adds new information.
- Create new entity pages for entities not already in the wiki.
- Update the Connections section with bidirectional [[wikilink]] references.
- Note contradictions in the Contradictions section if the source conflicts with existing wiki content.
- The sourcePage should be a genuine summary, not a raw text dump.
- Do not exceed 10 entityPages per ingest to control token cost.
- CRITICAL: Every entry in updatedIndex must have a descriptive one-line summary 
  after the em-dash. The Relevance Scoring Agent reads only the index to decide 
  which wikis are relevant to a journalist's tip. Vague or missing summaries 
  directly degrade the accuracy of relevance scoring.
`;

function buildIngestPrompt({ indexMd, entityTitles, filename, ext, rawText }) {
  return INGEST_PROMPT_TEMPLATE
    .replace('{indexMd}', indexMd)
    .replace('{existingEntityTitles}', entityTitles.join(', '))
    .replace('{filename}', filename)
    .replace('{ext}', ext || 'text')
    .replace('{rawText}', rawText);
}

function chunkText(text, chunkSize = 20000, overlap = 2000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { content, frontmatter: {} };
  const yamlText = match[1];
  const frontmatter = {};
  for (const line of yamlText.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      frontmatter[key] = val;
    }
  }
  return { content: content.slice(match[0].length), frontmatter };
}

async function callIngestLLM(client, systemPrompt, userPrompt, rawText, onProgress) {
  const MAX_SINGLE_PASS = 30000;

  if (rawText.length <= MAX_SINGLE_PASS) {
    console.log(`[Ingest] Prompt length: ${userPrompt.length} chars (~${Math.round(userPrompt.length / 4)} tokens estimated)`);
    console.log(`[Ingest] Chunk 1 of 1`);
    return await sendWithRetry(client, systemPrompt, userPrompt);
  }

  const chunks = chunkText(rawText);
  console.log(`[Ingest] Document split into ${chunks.length} chunks`);

  let accumulatedResult = null;
  for (let i = 0; i < chunks.length; i++) {
    const chunkPrompt = buildIngestPrompt({
      indexMd: accumulatedResult?.updatedIndex || userPrompt.match(/## Current Wiki Index\n([\s\S]*?)\n## Existing Entities/)?.[1] || '',
      entityTitles: accumulatedResult
        ? [...accumulatedResult.entityPages.map((p) => p.title), ...accumulatedResult.conceptPages.map((p) => p.title)]
        : [],
      filename: userPrompt.match(/Filename: (.*)/)?.[1] || '',
      ext: userPrompt.match(/Format: (.*)/)?.[1] || '',
      rawText: chunks[i],
    });

    console.log(`[Ingest] Prompt length: ${chunkPrompt.length} chars (~${Math.round(chunkPrompt.length / 4)} tokens estimated)`);
    console.log(`[Ingest] Chunk ${i + 1} of ${chunks.length}`);
    if (onProgress) onProgress('analyzing', i + 1, chunks.length);

    const raw = await sendWithRetry(client, systemPrompt, chunkPrompt);
    const parsed = parseIngestJSON(raw);

    if (i === 0) {
      accumulatedResult = parsed;
    } else {
      // Merge entity pages: update existing, add new
      const existingEntities = new Map(accumulatedResult.entityPages.map((p) => [p.title, p]));
      for (const p of parsed.entityPages) {
        existingEntities.set(p.title, p);
      }
      accumulatedResult.entityPages = Array.from(existingEntities.values());

      const existingConcepts = new Map(accumulatedResult.conceptPages.map((p) => [p.title, p]));
      for (const p of parsed.conceptPages) {
        existingConcepts.set(p.title, p);
      }
      accumulatedResult.conceptPages = Array.from(existingConcepts.values());

      accumulatedResult.updatedIndex = parsed.updatedIndex;
      accumulatedResult.logEntry += `; chunk ${i + 1}: ${parsed.logEntry}`;
    }
  }

  return accumulatedResult;
}

async function sendWithRetry(client, systemPrompt, userPrompt, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.sendMessage(systemPrompt, userPrompt, 0.2);
    } catch (err) {
      console.error(`[Ingest] LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

function parseIngestJSON(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM response did not contain JSON object');
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.updatedIndex) throw new Error('LLM response missing updatedIndex');
  if (!parsed.sourcePage) throw new Error('LLM response missing sourcePage');
  parsed.entityPages = parsed.entityPages || [];
  parsed.conceptPages = parsed.conceptPages || [];
  parsed.logEntry = parsed.logEntry || 'Ingested document';
  return parsed;
}

export async function ingestDocument(kbName, file, config, onProgress) {
  const filename = file.name;

  // 1. Extract and store raw text
  if (onProgress) onProgress('extracting');
  await storeRawSource(kbName, filename, file);
  const source = await getRawSource(kbName, filename);
  const rawText = source?.text || '';

  // 2. Read context
  const schema = await getSchema(kbName);
  const indexMd = await readWikiIndex(kbName);
  const entityTitles = await listWikiPages(kbName, 'entity');

  // 3. Build prompt
  const client = new LLMClient(config);
  const systemPrompt = await buildAgentSystemPrompt(
    kbName,
    'You are a wiki maintainer. Process sources and return structured JSON.'
  );
  const userPrompt = buildIngestPrompt({ indexMd, entityTitles, filename, ext: source?.ext, rawText });

  // 4. Call LLM (with chunking if needed)
  let result;
  try {
    if (rawText.length <= 30000) {
      console.log(`[Ingest] Calling LLM for ${kbName} / ${filename}`);
      console.log(`[Ingest] Prompt length: ${userPrompt.length} chars (~${Math.round(userPrompt.length / 4)} tokens estimated)`);
      console.log(`[Ingest] Chunk 1 of 1`);
      if (onProgress) onProgress('analyzing', 1, 1);
      const raw = await sendWithRetry(client, systemPrompt, userPrompt);
      result = parseIngestJSON(raw);
    } else {
      console.log(`[Ingest] Calling LLM for ${kbName} / ${filename}`);
      result = await callIngestLLM(client, systemPrompt, userPrompt, rawText, onProgress);
    }
  } catch (err) {
    console.error(`[Ingest] Failed to process ${filename}: ${err.message}`);
    throw new Error(`LLM ingestion failed: ${err.message}`);
  }

  // 5. Build operations
  if (onProgress) onProgress('writing');
  const operations = [];

  const sourceFm = extractFrontmatter(result.sourcePage.content);
  operations.push({
    type: 'page',
    pageType: 'source',
    title: result.sourcePage.title,
    content: sourceFm.content,
    frontmatter: sourceFm.frontmatter,
  });

  for (const p of result.entityPages) {
    const fm = extractFrontmatter(p.content);
    operations.push({
      type: 'page',
      pageType: 'entity',
      title: p.title,
      content: fm.content,
      frontmatter: fm.frontmatter,
    });
  }

  for (const p of result.conceptPages) {
    const fm = extractFrontmatter(p.content);
    operations.push({
      type: 'page',
      pageType: 'concept',
      title: p.title,
      content: fm.content,
      frontmatter: fm.frontmatter,
    });
  }

  operations.push({ type: 'index', markdown: result.updatedIndex });
  operations.push({ type: 'log', entry: `ingest | ${filename} — ${result.logEntry}` });

  // 6. Write transactionally
  await batchWriteWikiPages(kbName, operations);

  // 7. Maintain backlinks
  const allPageTitles = [
    result.sourcePage.title,
    ...result.entityPages.map((p) => p.title),
    ...result.conceptPages.map((p) => p.title),
  ];
  for (const page of [...result.entityPages, ...result.conceptPages, result.sourcePage]) {
    const refs = (page.content || '').match(/\[\[([^\]]+)\]\]/g) || [];
    const targets = refs.map((r) => r.replace(/\[\[|\]\]/g, '')).filter((t) => allPageTitles.includes(t) || entityTitles.includes(t));
    if (targets.length > 0) {
      await maintainBacklinks(kbName, page.title, targets);
    }
  }

  if (onProgress) onProgress('done', result.entityPages.length, result.conceptPages.length);
}

// Legacy fallback: regex-based stub ingest when LLM is unavailable
export async function legacyIngestDocument(kbName, file) {
  const filename = file.name;
  await storeRawSource(kbName, filename, file);
  const source = await getRawSource(kbName, filename);
  const rawText = source?.text || '';

  const sourceTitle = filename.replace(/\.[^.]+$/, '');
  await saveWikiPage(kbName, 'source', sourceTitle,
    `# Source: ${filename}\n\nFormat: ${source?.ext || 'text'}\n\n## Extracted Text\n\n${rawText.slice(0, 2000)}`,
    { source_count: 1, status: 'active' }
  );

  const entityNames = new Set();
  for (const line of rawText.split('\n')) {
    const matches = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
    if (matches) {
      for (const m of matches) entityNames.add(m);
    }
  }

  const indexMd = await readWikiIndex(kbName);
  const index = parseIndex(indexMd);

  if (!index.sources) index.sources = [];
  index.sources.push({ title: sourceTitle, summary: `Source file ${filename}` });

  if (!index.entities) index.entities = [];
  for (const name of Array.from(entityNames).slice(0, 10)) {
    await saveWikiPage(kbName, 'entity', name,
      `# ${name}\n\n## Summary\n\nMentioned in ${filename}.\n\n## Connections\n\n## Sources\n\n- [[${sourceTitle}]]\n\n## Contradictions\n\nNone.`,
      { source_count: 1, status: 'active' }
    );
    index.entities.push({ title: name, summary: `Mentioned in ${filename}` });
  }

  let newIndexMd = `# ${kbName}\n`;
  for (const section of ['entities', 'concepts', 'sources', 'synthesis']) {
    newIndexMd += `\n## ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
    const items = index[section] || [];
    for (const item of items) {
      newIndexMd += `- [[${item.title}]]${item.summary ? ` — ${item.summary}` : ''}\n`;
    }
  }

  await updateWikiIndex(kbName, newIndexMd);
  await appendWikiLog(kbName, `Ingested ${filename} (${source?.ext || 'text'}, ${rawText.length} chars) [legacy fallback]`);
}
