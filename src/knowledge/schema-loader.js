import fs from 'fs/promises';
import path from 'path';

const REQUIRED_SECTIONS = [
  'Page Types',
  'Ingest Rules',
  'Query Behavior',
  'Citation Format',
  'Verification Thresholds',
];

export async function loadSchema(kbName) {
  const schemaPath = path.resolve('data', kbName, 'schema.md');
  const text = await fs.readFile(schemaPath, 'utf-8');

  const missing = REQUIRED_SECTIONS.filter((s) => !text.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `Schema for ${kbName} is missing required sections: ${missing.join(', ')}`
    );
  }

  const rules = {
    pageTypes: extractTable(text, 'Page Types'),
    ingestRules: extractSection(text, 'Ingest Rules'),
    queryBehavior: extractSection(text, 'Query Behavior'),
    citationFormat: extractSection(text, 'Citation Format'),
    verificationThresholds: extractSection(text, 'Verification Thresholds'),
  };

  return rules;
}

function extractSection(text, heading) {
  const regex = new RegExp(
    `## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`
  );
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractTable(text, heading) {
  const section = extractSection(text, heading);
  const lines = section.split('\n').filter((l) => l.startsWith('|') && l.includes('—'));
  const rows = [];
  for (const line of lines) {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      rows.push({ type: cells[0], directory: cells[1], description: cells[2] || '' });
    }
  }
  return rows;
}
