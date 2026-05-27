import { createKnowledgeBase, saveWikiPage, updateWikiIndex, appendWikiLog } from './wikiStore.js';
import { storeRawSource } from './rawVault.js';

export async function loadDemoData(kbName) {
  const res = await fetch(`./demo-data/${kbName}.json`);
  if (!res.ok) throw new Error(`Failed to load demo data for ${kbName}`);
  const bundle = await res.json();

  await createKnowledgeBase(kbName, bundle.schemaText);

  for (const page of bundle.pages) {
    await saveWikiPage(kbName, page.type, page.title, page.content);
  }

  const sections = { entities: [], concepts: [], sources: [], synthesis: [] };
  for (const page of bundle.pages) {
    const section = page.type + 's';
    if (sections[section]) {
      sections[section].push({ title: page.title, summary: '' });
    }
  }
  await updateWikiIndex(kbName, sections);

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
  const kbs = ['kb-business-registry', 'kb-sanctions', 'kb-procurement'];
  for (const kb of kbs) {
    await loadDemoData(kb);
  }
}
