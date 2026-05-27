import { readWikiIndex, loadWikiPage } from '../lib/wikiStore.js';

export async function queryWiki(kbName, question) {
  const index = await readWikiIndex(kbName);
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
    const pageData = await loadWikiPage(kbName, sectionDir, page.title);
    if (pageData) {
      contents.push({ title: page.title, text: pageData.content || '' });
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
    entities: 'entity',
    concepts: 'concept',
    sources: 'source',
    synthesis: 'synthesis',
  };
  return map[section] || section;
}
