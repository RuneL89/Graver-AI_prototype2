import { dbSet, dbGet, dbKeys } from './db.js';
import { parsePdfFile } from './pdfParser.js';

export async function storeRawSource(kbName, filename, file) {
  const arrayBuffer = await file.arrayBuffer();
  const ext = filename.split('.').pop().toLowerCase();
  let text = '';
  if (ext === 'pdf') {
    const result = await parsePdfFile(file);
    text = result.text;
  } else if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
    text = await file.text();
  }
  await dbSet(`raw.${kbName}.files`, filename, {
    filename,
    type: file.type,
    size: file.size,
    text,
    ext,
    storedAt: new Date().toISOString(),
  });
}

export async function getRawSource(kbName, filename) {
  return dbGet(`raw.${kbName}.files`, filename);
}

export async function listRawSources(kbName) {
  return dbKeys(`raw.${kbName}.files`);
}

export async function readRawSourceText(kbName, filename) {
  const source = await getRawSource(kbName, filename);
  return source?.text || '';
}
