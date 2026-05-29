import { saveWikiPage, loadWikiPage, updateWikiIndex, readWikiIndex, appendWikiLog } from '../lib/wikiStore.js';

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
    const parts = filePath.split('/');
    const kbIndex = parts.indexOf('data') + 1;
    const kbName = parts[kbIndex] || 'unknown';
    const pageType = frontmatter.type || 'unknown';
    const title = parts[parts.length - 1].replace('.md', '');
    return new WikiPage({ kbName, pageType, title, content, frontmatter });
  }

  async save() {
    await saveWikiPage(this.kbName, this.pageType, this.title, this.content, this.frontmatter);
  }

  static async load(kbName, pageType, title) {
    const page = await loadWikiPage(kbName, pageType, title);
    if (!page) return null;
    return new WikiPage({
      kbName,
      pageType: page.type,
      title: page.title,
      content: page.content,
      frontmatter: page.frontmatter,
    });
  }
}

export async function appendLog(kbName, entry) {
  await appendWikiLog(kbName, entry);
}

export async function readIndex(kbName) {
  return readWikiIndex(kbName);
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
      const match = line.match(/- (?:\[\[)?([^\]]+)(?:\]\])?\s*(?:[-–—]\s*(.*))?/);
      if (match) {
        sections[current].push({ title: match[1].trim(), summary: (match[2] || '').trim() });
      }
    }
  }
  return sections;
}

export async function updateIndex(kbName, markdown) {
  await updateWikiIndex(kbName, markdown);
}
