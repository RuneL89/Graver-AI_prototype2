import { readWikiIndex, loadWikiPage, listWikiPages } from './wikiStore.js';
import { appendWikiLog } from './wikiStore.js';

export async function lintWiki(kbName) {
  const issues = [];
  const index = await readWikiIndex(kbName);

  const allIndexed = new Set([
    ...(index.entities || []).map((i) => i.title),
    ...(index.concepts || []).map((i) => i.title),
    ...(index.sources || []).map((i) => i.title),
    ...(index.synthesis || []).map((i) => i.title),
  ]);

  for (const sub of ['entity', 'concept', 'source', 'synthesis']) {
    const pages = await listWikiPages(kbName, sub);
    for (const title of pages) {
      if (!allIndexed.has(title)) {
        issues.push(`Orphan page: ${sub}/${title}.md not in index`);
      }
    }
  }

  const entityPages = await listWikiPages(kbName, 'entity');
  const conceptPages = await listWikiPages(kbName, 'concept');
  const conceptSet = new Set(conceptPages);

  for (const title of entityPages) {
    const page = await loadWikiPage(kbName, 'entity', title);
    if (!page) {
      issues.push(`Missing entity page: ${title}`);
      continue;
    }
    const refs = (page.content || '').match(/\[\[([^\]]+)\]\]/g) || [];
    for (const ref of refs) {
      const name = ref.replace(/\[\[|\]\]/g, '');
      if (!conceptSet.has(name) && !allIndexed.has(name)) {
        issues.push(`Missing referenced page: ${name} (referenced by ${title})`);
      }
    }
  }

  const report = issues.length
    ? issues.join('\n')
    : 'No issues found. Wiki is consistent.';

  await appendWikiLog(kbName, `Lint complete: ${issues.length} issues`);
  return report;
}
