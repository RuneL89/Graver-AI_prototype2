import fs from 'fs/promises';
import path from 'path';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

export class WikiPage {
  constructor({ kbName, pageType, title, content = '', frontmatter = {} }) {
    this.kbName = kbName;
    this.pageType = pageType;
    this.title = title;
    this.content = content;
    this.frontmatter = {
      type: pageType,
      date_created: new Date().toISOString().split('T')[0],
      source_count: 0,
      status: 'active',
      ...frontmatter,
    };
  }

  get filePath() {
    const dir = {
      entity: 'entities',
      concept: 'concepts',
      source: 'sources',
      synthesis: 'synthesis',
    }[this.pageType];
    if (!dir) throw new Error(`Unknown page type: ${this.pageType}`);
    return path.resolve('data', this.kbName, 'wiki', dir, `${this.title}.md`);
  }

  toMarkdown() {
    const yaml = Object.entries(this.frontmatter)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n');
    return `---\n${yaml}\n---\n\n${this.content}`;
  }

  static fromMarkdown(text, filePath) {
    const match = text.match(FRONTMATTER_REGEX);
    let frontmatter = {};
    let content = text;
    if (match) {
      const yamlText = match[1];
      content = text.slice(match[0].length);
      for (const line of yamlText.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          frontmatter[key] = val;
        }
      }
    }
    const parts = filePath.split(path.sep);
    const kbIndex = parts.indexOf('data') + 1;
    const kbName = parts[kbIndex] || 'unknown';
    const pageType = frontmatter.type || 'unknown';
    const title = path.basename(filePath, '.md');
    return new WikiPage({ kbName, pageType, title, content, frontmatter });
  }

  async save() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, this.toMarkdown());
  }

  static async load(filePath) {
    const text = await fs.readFile(filePath, 'utf-8');
    return WikiPage.fromMarkdown(text, filePath);
  }
}

export async function appendLog(kbName, entry) {
  const logPath = path.resolve('data', kbName, 'wiki', 'log.md');
  const line = `- ${new Date().toISOString()} — ${entry}\n`;
  await fs.appendFile(logPath, line);
}

export async function readIndex(kbName) {
  const indexPath = path.resolve('data', kbName, 'wiki', 'index.md');
  try {
    const text = await fs.readFile(indexPath, 'utf-8');
    return parseIndex(text);
  } catch {
    return { entities: [], concepts: [], sources: [], synthesis: [] };
  }
}

export function parseIndex(text) {
  const sections = { entities: [], concepts: [], sources: [], synthesis: [] };
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## Entities')) current = 'entities';
    else if (line.startsWith('## Concepts')) current = 'concepts';
    else if (line.startsWith('## Sources')) current = 'sources';
    else if (line.startsWith('## Synthesis')) current = 'synthesis';
    else if (current && line.trim().startsWith('- ')) {
      const match = line.match(/- (?:\[\[)?([^\]]+)(?:\]\])?\s*(?:[–-]\s*(.*))?/);
      if (match) {
        sections[current].push({ title: match[1].trim(), summary: (match[2] || '').trim() });
      }
    }
  }
  return sections;
}

export async function updateIndex(kbName, sections) {
  const indexPath = path.resolve('data', kbName, 'wiki', 'index.md');
  let md = `# ${kbName} Index\n\nContent catalog for the ${kbName} knowledge base.\n\n`;
  for (const [key, items] of Object.entries(sections)) {
    md += `## ${key[0].toUpperCase() + key.slice(1)}\n\n`;
    for (const item of items) {
      md += `- [[${item.title}]]${item.summary ? ` — ${item.summary}` : ''}\n`;
    }
    md += '\n';
  }
  await fs.writeFile(indexPath, md);
}
