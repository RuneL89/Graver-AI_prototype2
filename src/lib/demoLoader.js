import { createKnowledgeBase, saveWikiPage, updateWikiIndex, appendWikiLog } from './wikiStore.js';
import { storeRawSource } from './rawVault.js';
import { validateSchema } from '../shared/schema-loader.js';

export async function loadDemoData(kbName) {
  const res = await fetch(`./demo-data/${kbName}.json`);
  if (!res.ok) throw new Error(`Failed to load demo data for ${kbName}`);
  const bundle = await res.json();

  await createKnowledgeBase(kbName, bundle.schemaText);

  const validation = validateSchema(bundle.schemaText || '');
  if (!validation.valid) {
    console.warn(`[demoLoader] Demo schema for ${kbName} missing sections: ${validation.missing.join(', ')}`);
  }

  for (const page of bundle.pages) {
    await saveWikiPage(kbName, page.type, page.title, page.content);
  }

  // Build markdown index string from pages array
  let indexMd = `# ${kbName}\n`;
  for (const section of ['entities', 'concepts', 'sources', 'synthesis']) {
    indexMd += `\n## ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
    const items = bundle.pages.filter((p) => p.type + 's' === section);
    for (const item of items) {
      indexMd += `- [[${item.title}]]\n`;
    }
  }
  await updateWikiIndex(kbName, indexMd);

  await appendWikiLog(kbName, 'Demo data loaded');

  // Load raw files
  try {
    const rawRes = await fetch(`./demo-data/raw/${kbName}/manifest.json`);
    if (rawRes.ok) {
      const manifest = await rawRes.json();
      for (const file of manifest.files) {
        const fileRes = await fetch(`./demo-data/raw/${kbName}/${file}`);
        if (fileRes.ok) {
          const blob = await fileRes.blob();
          const fakeFile = new File([blob], file, { type: blob.type });
          await storeRawSource(kbName, file, fakeFile);
        }
      }
    }
  } catch {
    // Raw files are optional for demo
  }
}

export async function loadAllDemoData() {
  try {
    const res = await fetch('./demo-data/manifest.json');
    if (!res.ok) throw new Error('No manifest found');
    const manifest = await res.json();
    for (const kb of manifest.kbs || []) {
      await loadDemoData(kb);
    }
  } catch (err) {
    console.warn('[demoLoader] Failed to load manifest, falling back to hardcoded list:', err.message);
    const kbs = ['kb-business-registry', 'kb-sanctions', 'kb-procurement'];
    for (const kb of kbs) {
      await loadDemoData(kb);
    }
  }
}
