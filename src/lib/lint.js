import { readWikiIndex, loadWikiPage, listWikiPages } from './wikiStore.js';
import { appendWikiLog } from './wikiStore.js';
import { parseIndex } from '../knowledge/wiki-page.js';
import { getSchema } from './wikiStore.js';
import { validateSchema } from '../shared/schema-loader.js';
import { runSemanticLint, buildLintReport } from '../agents/lint-agent.js';

export async function lintWiki(kbName, config) {
  // Try semantic lint first if config is available
  if (config?.apiBaseUrl && config?.modelName) {
    try {
      const result = await runSemanticLint(kbName, config);
      const report = buildLintReport(kbName, result);
      await appendWikiLog(kbName, `lint | ${report.summary}`);
      return report;
    } catch (err) {
      console.error(`[lint] Semantic lint failed: ${err.message}. Falling back to structural lint.`);
    }
  }

  // Structural fallback
  const issues = [];
  const indexMd = await readWikiIndex(kbName);
  const index = parseIndex(indexMd);

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

  // Schema validation
  const schemaText = (await getSchema(kbName)) || '';
  const schemaValidation = validateSchema(schemaText);
  if (!schemaValidation.valid) {
    issues.push(`Schema missing required sections: ${schemaValidation.missing.join(', ')}`);
  } else {
    issues.push('Schema OK: all required sections present.');
  }

  const reportText = issues.length
    ? issues.join('\n')
    : 'No issues found. Wiki is consistent.';

  await appendWikiLog(kbName, `Lint complete: ${issues.length} issues`);
  return {
    summary: `${issues.length} issues`,
    text: reportText,
    structured: {
      contradictions: [],
      staleClaims: [],
      orphans: issues.filter((i) => i.startsWith('Orphan')).map((i) => ({ page: i, reason: 'not in index' })),
      missingConcepts: [],
      dataGaps: [],
      brokenLinks: issues.filter((i) => i.startsWith('Missing referenced')).map((i) => {
        const match = i.match(/referenced by (.+)/);
        return { page: match ? match[1] : '', deadLink: i.match(/Missing referenced page: ([^ ]+)/)?.[1] || '' };
      }),
      suggestions: [],
    },
  };
}
