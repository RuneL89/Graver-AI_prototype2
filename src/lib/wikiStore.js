import { dbSet, dbGet, dbDelete, dbKeys } from './db.js';

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
  return { entities: [], concepts: [], sources: [], synthesis: [] };
}

export async function updateWikiIndex(kbName, sections) {
  await dbSet(`wiki.${kbName}.index`, 'index', sections);
}

export async function appendWikiLog(kbName, entry) {
  const logs = (await dbGet(`wiki.${kbName}.log`, 'entries')) || [];
  logs.push({ timestamp: new Date().toISOString(), entry });
  await dbSet(`wiki.${kbName}.log`, 'entries', logs);
}

export async function listKnowledgeBases() {
  const keys = await dbKeys('wiki');
  const set = new Set();
  for (const k of keys) {
    const match = k.match(/^wiki\.([^.]+)\./);
    if (match) set.add(match[1]);
  }
  return Array.from(set).sort();
}

export async function createKnowledgeBase(kbName, schemaMarkdown) {
  await dbSet(`wiki.${kbName}.meta`, 'schema', schemaMarkdown || '');
  await updateWikiIndex(kbName, { entities: [], concepts: [], sources: [], synthesis: [] });
  await appendWikiLog(kbName, 'Knowledge base created');
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
