import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = 'data';
const OUTPUT_DIR = 'public/demo-data';

async function bundleWiki(kbName) {
  const wikiDir = path.join(DATA_DIR, kbName, 'wiki');
  const pages = [];

  for (const sub of ['entities', 'concepts', 'sources', 'synthesis']) {
    const dir = path.join(wikiDir, sub);
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const text = await fs.readFile(path.join(dir, file), 'utf-8');
      pages.push({
        title: file.replace('.md', ''),
        type: sub.slice(0, -1), // entities -> entity
        content: text,
      });
    }
  }

  const indexPath = path.join(wikiDir, 'index.md');
  let indexText = '';
  try {
    indexText = await fs.readFile(indexPath, 'utf-8');
  } catch {
    // ignore
  }

  const logPath = path.join(wikiDir, 'log.md');
  let logText = '';
  try {
    logText = await fs.readFile(logPath, 'utf-8');
  } catch {
    // ignore
  }

  const schemaPath = path.join(DATA_DIR, kbName, 'schema.md');
  let schemaText = '';
  try {
    schemaText = await fs.readFile(schemaPath, 'utf-8');
  } catch {
    // ignore
  }

  const bundle = { kbName, pages, indexText, logText, schemaText };
  const outPath = path.join(OUTPUT_DIR, `${kbName}.json`);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(bundle, null, 2));
  console.log(`Bundled ${pages.length} pages for ${kbName} → ${outPath}`);
}

async function bundleRaw(kbName) {
  const rawDir = path.join(DATA_DIR, kbName, 'raw');
  const outDir = path.join(OUTPUT_DIR, 'raw', kbName);
  let files = [];
  try {
    files = await fs.readdir(rawDir);
  } catch {
    return;
  }
  await fs.mkdir(outDir, { recursive: true });
  for (const file of files.filter((f) => !f.startsWith('.'))) {
    const src = path.join(rawDir, file);
    const dst = path.join(outDir, file);
    await fs.copyFile(src, dst);
  }
  console.log(`Copied raw files for ${kbName}`);
}

async function main() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const kbs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('kb-') && e.name !== 'kb-registry')
    .map((e) => e.name);

  for (const kb of kbs) {
    await bundleWiki(kb);
    await bundleRaw(kb);
  }

  console.log('Demo data bundling complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
