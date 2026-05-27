import fs from 'fs/promises';
import path from 'path';
import { readRawSource } from './raw-vault.js';
import { WikiPage, appendLog, readIndex, updateIndex } from './wiki-page.js';

async function main() {
  const args = process.argv.slice(2);
  const kbFlag = args.find((a) => a.startsWith('--kb='));
  const sourceFlag = args.find((a) => a.startsWith('--source='));

  if (!kbFlag || !sourceFlag) {
    console.error('Usage: node ingest-cli.js --kb=kb-name --source=raw/filename.ext');
    process.exit(1);
  }

  const kbName = kbFlag.replace('--kb=', '');
  const sourceFile = sourceFlag.replace('--source=', '');
  const filename = path.basename(sourceFile);

  console.log(`Ingesting ${filename} into ${kbName}...`);

  const raw = await readRawSource(kbName, filename);

  // Create source summary page
  const sourcePage = new WikiPage({
    kbName,
    pageType: 'source',
    title: filename.replace(/\.[^.]+$/, ''),
    content: `# Source: ${filename}\n\nFormat: ${raw.format}\n\n## Extracted Text\n\n${raw.text.slice(0, 2000)}`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await sourcePage.save();

  // Extract simple entities (naive: lines with capitalized names)
  const entityNames = new Set();
  for (const line of raw.text.split('\n')) {
    const matches = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
    if (matches) {
      for (const m of matches) entityNames.add(m);
    }
  }

  const index = await readIndex(kbName);
  index.sources.push({ title: sourcePage.title, summary: `Source file ${filename}` });

  for (const name of Array.from(entityNames).slice(0, 10)) {
    const entityPage = new WikiPage({
      kbName,
      pageType: 'entity',
      title: name,
      content: `# ${name}\n\n## Summary\n\nMentioned in ${filename}.\n\n## Connections\n\n## Sources\n\n- [[${sourcePage.title}]]\n\n## Contradictions\n\nNone.`,
      frontmatter: { source_count: 1, status: 'active' },
    });
    await entityPage.save();
    index.entities.push({ title: name, summary: `Mentioned in ${filename}` });
  }

  await updateIndex(kbName, index);
  await appendLog(kbName, `Ingested ${filename} (${raw.format}, ${raw.text.length} chars)`);
  console.log('Ingest complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
