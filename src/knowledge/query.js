import fs from 'fs/promises';
import path from 'path';
import { parseIndex, WikiPage } from './wiki-page.js';

export async function queryWiki(kbName, question) {
  const indexPath = path.resolve('data', kbName, 'wiki', 'index.md');
  const indexText = await fs.readFile(indexPath, 'utf-8').catch(() => '');
  const index = parseIndex(indexText);

  const relevantPages = [];
  const q = question.toLowerCase();

  for (const [section, items] of Object.entries(index)) {
    for (const item of items) {
      if (item.title.toLowerCase().includes(q) || (item.summary && item.summary.toLowerCase().includes(q))) {
        relevantPages.push({ section, ...item });
      }
    }
  }

  const contents = [];
  for (const page of relevantPages) {
    const sectionDir = sectionToDir(page.section);
    const pagePath = path.resolve('data', kbName, 'wiki', sectionDir, `${page.title}.md`);
    try {
      const text = await fs.readFile(pagePath, 'utf-8');
      contents.push({ title: page.title, text });
    } catch {
      // skip missing
    }
  }

  const citations = contents.map((c) => `[[${c.title}]]`);
  const synthesized = contents.map((c) => c.text.slice(0, 600)).join('\n\n');

  return {
    kbName,
    question,
    relevantPages: relevantPages.map((p) => p.title),
    answer: `Synthesized from ${contents.length} pages.\n\n${synthesized}`,
    citations,
  };
}

function sectionToDir(section) {
  const map = {
    entities: 'entities',
    concepts: 'concepts',
    sources: 'sources',
    synthesis: 'synthesis',
  };
  return map[section] || section;
}
