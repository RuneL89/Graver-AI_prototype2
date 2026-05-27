import { saveWikiPage, updateWikiIndex, appendWikiLog, readWikiIndex } from './wikiStore.js';
import { storeRawSource } from './rawVault.js';

export async function ingestDocument(kbName, file) {
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

  const index = await readWikiIndex(kbName);
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

  await updateWikiIndex(kbName, index);
  await appendWikiLog(kbName, `Ingested ${filename} (${source?.ext || 'text'}, ${rawText.length} chars)`);
}

import { getRawSource } from './rawVault.js';
