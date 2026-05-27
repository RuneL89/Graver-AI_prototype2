import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

let pdfParse;
try {
  pdfParse = (await import('pdf-parse')).default;
} catch {
  pdfParse = null;
}

async function parsePdfWithPython(filePath) {
  return new Promise((resolve, reject) => {
    const py = spawn('/workspaces/Graver-AI_prototype2/.venv/bin/python3', [
      '-c',
      `import pdfplumber, sys; pdf=pdfplumber.open(sys.argv[1]); text="\\n".join([p.extract_text() or "" for p in pdf.pages]); print(text)`,
      filePath,
    ]);
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d));
    py.stderr.on('data', (d) => (err += d));
    py.on('close', (code) => {
      if (code !== 0) reject(new Error(err || `Python exit ${code}`));
      else resolve(out);
    });
  });
}

export async function readRawSource(kbName, filename) {
  const rawPath = path.resolve('data', kbName, 'raw', filename);
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') {
    const buffer = await fs.readFile(rawPath);
    let text = '';
    let pages = 0;
    if (pdfParse) {
      try {
        const data = await pdfParse(buffer);
        text = data.text;
        pages = data.numpages;
      } catch (e) {
        console.error(`pdf-parse failed for ${filename}, falling back to Python/pdfplumber: ${e.message}`);
        text = await parsePdfWithPython(rawPath);
        pages = text.split('\f').length;
      }
    } else {
      text = await parsePdfWithPython(rawPath);
      pages = text.split('\f').length;
    }
    return { text, format: 'pdf', pages };
  }

  if (ext === '.json') {
    const text = await fs.readFile(rawPath, 'utf-8');
    return { text, format: 'json', parsed: JSON.parse(text) };
  }

  if (ext === '.csv') {
    const text = await fs.readFile(rawPath, 'utf-8');
    return { text, format: 'csv' };
  }

  if (ext === '.md' || ext === '.txt') {
    const text = await fs.readFile(rawPath, 'utf-8');
    return { text, format: 'text' };
  }

  throw new Error(`Unsupported raw source format: ${ext}`);
}

export async function listRawSources(kbName) {
  const rawDir = path.resolve('data', kbName, 'raw');
  try {
    const files = await fs.readdir(rawDir);
    return files.filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
}

export function assertRawImmutable(kbName) {
  const rawDir = path.resolve('data', kbName, 'raw');
  const handler = {
    set() {
      throw new Error('Raw Source Vault is immutable at runtime.');
    },
    deleteProperty() {
      throw new Error('Raw Source Vault is immutable at runtime.');
    },
  };
  return new Proxy({ path: rawDir }, handler);
}
