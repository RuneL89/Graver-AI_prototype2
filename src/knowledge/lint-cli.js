import fs from 'fs/promises';
import path from 'path';
import { readIndex, appendLog } from './wiki-page.js';

async function main() {
  const args = process.argv.slice(2);
  const kbFlag = args.find((a) => a.startsWith('--kb='));
  if (!kbFlag) {
    console.error('Usage: node lint-cli.js --kb=kb-name');
    process.exit(1);
  }
  const kbName = kbFlag.replace('--kb=', '');

  console.log(`Linting ${kbName}...`);
  const issues = [];

  const index = await readIndex(kbName);
  const wikiDir = path.resolve('data', kbName, 'wiki');

  // Build set of all known page titles across all sections
  const allIndexed = new Set([
    ...index.entities.map((i) => i.title),
    ...index.concepts.map((i) => i.title),
    ...index.sources.map((i) => i.title),
    ...index.synthesis.map((i) => i.title),
  ]);

  // Orphan pages
  for (const sub of ['entities', 'concepts', 'sources', 'synthesis']) {
    const dir = path.join(wikiDir, sub);
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const title = file.replace('.md', '');
      if (!allIndexed.has(title)) {
        issues.push(`Orphan page: ${sub}/${file} not in index.md`);
      }
    }
  }

  // Missing pages referenced in entity content
  const entityDir = path.join(wikiDir, 'entities');
  const entityFiles = await fs.readdir(entityDir).catch(() => []);
  for (const file of entityFiles.filter((f) => f.endsWith('.md'))) {
    const pagePath = path.join(entityDir, file);
    const text = await fs.readFile(pagePath, 'utf-8');
    const refs = text.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const ref of refs) {
      const name = ref.replace(/\[\[|\]\]/g, '');
      if (!allIndexed.has(name)) {
        // Check if file exists in any subdir before flagging
        let exists = false;
        for (const sub of ['entities', 'concepts', 'sources', 'synthesis']) {
          const p = path.join(wikiDir, sub, `${name}.md`);
          try {
            await fs.access(p);
            exists = true;
            break;
          } catch {
            // not found
          }
        }
        if (!exists) {
          issues.push(`Missing referenced page: ${name} (referenced by ${file.replace('.md', '')})`);
        }
      }
    }
  }

  const report = issues.length
    ? issues.join('\n')
    : 'No issues found. Wiki is consistent.';

  console.log(report);
  await appendLog(kbName, `Lint complete: ${issues.length} issues`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
