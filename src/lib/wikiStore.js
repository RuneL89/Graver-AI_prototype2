import { dbSet, dbGet, dbDelete, dbKeys, dbAllKeys } from './db.js';
import { validateSchema } from '../shared/schema-loader.js';
import { parseIndex } from '../knowledge/wiki-page.js';

// Index/Log Consumer Audit (Sprint 0 Task 0.1)
// File                        | Function            | Usage
// ----------------------------|---------------------|------------------------------------------
// src/lib/wikiStore.js        | readWikiIndex       | Returns index (now markdown string)
// src/lib/wikiStore.js        | updateWikiIndex     | Stores index (now markdown string)
// src/lib/wikiStore.js        | appendWikiLog       | Appends to log (now markdown string)
// src/lib/wikiStore.js        | createKnowledgeBase | Creates empty index + log
// src/knowledge/wiki-page.js  | readIndex           | Wrapper for readWikiIndex
// src/knowledge/wiki-page.js  | updateIndex         | Wrapper for updateWikiIndex
// src/knowledge/wiki-page.js  | appendLog           | Wrapper for appendWikiLog
// src/knowledge/wiki-page.js  | parseIndex          | Parses markdown index to structured object
// src/lib/demoLoader.js       | loadDemoData        | Stores markdown index, appends log
// src/lib/ingest.js           | ingestDocument      | Reads index, updates index, appends log
// src/lib/lint.js             | lintWiki            | Reads index, appends log
// src/agents/relevance-scorer | relevanceScore      | Reads index markdown for LLM prompt
// src/agents/swarm-orchestrat | runSwarm/researchAgent | Reads index markdown for LLM prompt
// src/agents/question-router  | routeQuestion       | Reads index markdown from active bases
// src/knowledge/query.js      | queryWiki           | Reads index, searches pages
// src/ui/components/WikiViewer| WikiViewer          | Reads index, parses for sidebar
// src/ui/components/WikiManager| WikiManager        | Reads index, parses for counts display

export async function loadWikiPage(kbName, pageType, title) {
  return dbGet(`wiki.${kbName}.pages`, `${pageType}/${title}`);
}

export async function saveWikiPage(kbName, pageType, title, content, frontmatter = {}) {
  const page = {
    title,
    type: pageType,
    content,
    frontmatter: {
      type: pageType,
      date_created: new Date().toISOString().split('T')[0],
      source_count: 0,
      status: 'active',
      ...frontmatter,
    },
  };
  await dbSet(`wiki.${kbName}.pages`, `${pageType}/${title}`, page);
}

export async function listWikiPages(kbName, pageType) {
  const keys = await dbKeys(`wiki.${kbName}.pages`);
  return keys
    .filter((k) => k.startsWith(`${pageType}/`))
    .map((k) => k.slice(`${pageType}/`.length));
}

export async function readWikiIndex(kbName) {
  const index = await dbGet(`wiki.${kbName}.index`, 'index');
  if (index) return index;
  return `# ${kbName}\n\n## Entities\n\n## Concepts\n\n## Sources\n\n## Synthesis\n`;
}

export async function updateWikiIndex(kbName, markdown) {
  await dbSet(`wiki.${kbName}.index`, 'index', markdown);
}

export async function appendWikiLog(kbName, entry) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].slice(0, 5);
  const logLine = `## [${date} ${time}] ${entry}\n`;
  const existing = (await dbGet(`wiki.${kbName}.log`, 'entries')) || `# Log: ${kbName}\n`;
  await dbSet(`wiki.${kbName}.log`, 'entries', existing + '\n' + logLine);
}

export async function listKnowledgeBases() {
  const keys = await dbAllKeys();
  const set = new Set();
  for (const k of keys) {
    const match = k.match(/^wiki\.([^.]+)\./);
    if (match) set.add(match[1]);
  }
  return Array.from(set).sort();
}

export async function createKnowledgeBase(kbName, schemaMarkdown) {
  await dbSet(`wiki.${kbName}.meta`, 'schema', schemaMarkdown || '');
  await updateWikiIndex(kbName, `# ${kbName}\n\n## Entities\n\n## Concepts\n\n## Sources\n\n## Synthesis\n`);
  await appendWikiLog(kbName, 'Knowledge base created');
  const validation = validateSchema(schemaMarkdown || '');
  if (!validation.valid) {
    console.warn(`[wikiStore] Schema for ${kbName} missing required sections: ${validation.missing.join(', ')}`);
  }
}

export async function deleteKnowledgeBase(kbName) {
  const namespaces = ['wiki', 'raw'];
  for (const ns of namespaces) {
    const keys = await dbKeys(`${ns}.${kbName}.pages`);
    for (const k of keys) await dbDelete(`${ns}.${kbName}.pages`, k);
    const idxKeys = await dbKeys(`${ns}.${kbName}.index`);
    for (const k of idxKeys) await dbDelete(`${ns}.${kbName}.index`, k);
    const logKeys = await dbKeys(`${ns}.${kbName}.log`);
    for (const k of logKeys) await dbDelete(`${ns}.${kbName}.log`, k);
    const metaKeys = await dbKeys(`${ns}.${kbName}.meta`);
    for (const k of metaKeys) await dbDelete(`${ns}.${kbName}.meta`, k);
  }
}

export async function getSchema(kbName) {
  return dbGet(`wiki.${kbName}.meta`, 'schema');
}

export async function setSchema(kbName, schemaMarkdown) {
  await dbSet(`wiki.${kbName}.meta`, 'schema', schemaMarkdown);
}

export function buildSynthesisMarkdown({ title, query, analysis, evidence, citations }) {
  const date = new Date().toISOString().split('T')[0];
  const sourceCount = citations?.length || 0;
  return `---
type: synthesis
date_created: ${date}
source_count: ${sourceCount}
status: active
query: "${query || ''}"
---

# Synthesis: ${title}

## Question
${query || 'N/A'}

## Analysis
${analysis || ''}

## Evidence
${(evidence || []).map((e) => `- [[${e.kb}]] — ${e.passage || ''}`).join('\n') || '- No evidence recorded'}

## Key Entities
${(citations || []).map((c) => `- [[${c.source}]]`).filter((v, i, a) => a.indexOf(v) === i).join('\n') || '- No entities recorded'}

## Citations
${(citations || []).map((c) => `- ${c.source}: ${c.passage?.slice(0, 120) || ''}`).join('\n') || '- No citations recorded'}
`;
}

export async function saveSynthesisPage(kbName, { title, query, analysis, evidence, citations }) {
  const content = buildSynthesisMarkdown({ title, query, analysis, evidence, citations });
  await saveWikiPage(kbName, 'synthesis', title, content, {
    source_count: citations?.length || 0,
    status: 'active',
    date_created: new Date().toISOString().split('T')[0],
  });

  // Update index properly via parse/rebuild
  const indexMd = await readWikiIndex(kbName);
  const index = parseIndex(indexMd);
  if (!index.synthesis) index.synthesis = [];
  index.synthesis.push({ title, summary: query ? query.slice(0, 80) : 'Synthesis page' });

  let newIndexMd = `# ${kbName}\n`;
  for (const section of ['entities', 'concepts', 'sources', 'synthesis']) {
    newIndexMd += `\n## ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
    const items = index[section] || [];
    for (const item of items) {
      newIndexMd += `- [[${item.title}]]${item.summary ? ` — ${item.summary}` : ''}\n`;
    }
  }
  await updateWikiIndex(kbName, newIndexMd);

  await appendWikiLog(kbName, `query | ${(query || '').slice(0, 80)} — Filed synthesis: ${title}`);

  // Maintain backlinks from referenced entities/concepts
  const refs = (content || '').match(/\[\[([^\]]+)\]\]/g) || [];
  const targets = refs.map((r) => r.replace(/\[\[|\]\]/g, '')).filter((t) => t !== title);
  if (targets.length > 0) {
    await maintainBacklinks(kbName, title, targets);
  }

  return title;
}

export async function maintainBacklinks(kbName, sourceTitle, targetTitles) {
  for (const target of targetTitles) {
    const page = await loadWikiPage(kbName, 'entity', target)
      || await loadWikiPage(kbName, 'concept', target)
      || await loadWikiPage(kbName, 'source', target)
      || await loadWikiPage(kbName, 'synthesis', target);

    if (!page) continue;

    const content = page.content || '';
    const connectionsMatch = content.match(/## Connections\n([\s\S]*?)(?=\n## |$)/);
    const existingConnections = connectionsMatch ? connectionsMatch[1] : '';

    if (existingConnections.includes(`[[${sourceTitle}]]`)) continue;

    const newConnection = `- [[${sourceTitle}]]\n`;
    const updatedContent = content.replace(
      /## Connections\n/,
      `## Connections\n${newConnection}`
    );

    await saveWikiPage(kbName, page.type, page.title, updatedContent, page.frontmatter);
  }
}

export async function batchWriteWikiPages(kbName, operations) {
  // Validate all operations before writing ( IndexedDB lacks cross-key transactions )
  for (const op of operations) {
    if (op.type === 'page' && (!op.title || op.title.includes(':'))) {
      throw new Error(`Invalid page title: ${op.title}`);
    }
  }
  for (const op of operations) {
    if (op.type === 'page') {
      await saveWikiPage(kbName, op.pageType, op.title, op.content, op.frontmatter || {});
    } else if (op.type === 'index') {
      await updateWikiIndex(kbName, op.markdown);
    } else if (op.type === 'log') {
      await appendWikiLog(kbName, op.entry);
    }
  }
}
