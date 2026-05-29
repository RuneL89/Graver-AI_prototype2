# Sprint 0: Data Model Migration — Markdown-ize the Index and Log

**Goal:** Convert the runtime representation of `index.md` and `log.md` from structured JSON objects to markdown strings. Update all code that reads, writes, or consumes the index and log to work with markdown. Ensure demo data loading stores markdown directly. Preserve all existing functionality.

**DO NOT proceed to Sprint 1 until ALL acceptance criteria below are met.**

---

## Task 0.1: Audit Current Index/Log Consumers

Before changing anything, create a complete inventory of every function and component that calls `readWikiIndex`, `updateWikiIndex`, `appendWikiLog`, `parseIndex`, or accesses the index/log structure directly.

Search the entire `src/` tree for:
- `readWikiIndex`
- `updateWikiIndex`
- `appendWikiLog`
- `readIndex` (from `wiki-page.js`)
- `updateIndex` (from `wiki-page.js`)
- `parseIndex`
- Direct access to `.entities`, `.concepts`, `.sources`, `.synthesis` on index objects

Document each call site with:
- File path
- Function name
- What it does with the index/log
- Whether it needs the JSON structure or can work with markdown

**Acceptance Criteria:**
- [ ] A complete list of all index/log consumers exists in a comment block at the top of `src/lib/wikiStore.js` (or in this sprint's notes).
- [ ] No call site is missed.

---

## Task 0.2: Rewrite `readWikiIndex` and `updateWikiIndex`

In `src/lib/wikiStore.js`, change the data model:

**Current API:**
```js
export async function readWikiIndex(kbName) {
  const index = await dbGet(`wiki.${kbName}.index`, 'index');
  if (index) return index;
  return { entities: [], concepts: [], sources: [], synthesis: [] };
}

export async function updateWikiIndex(kbName, sections) {
  await dbSet(`wiki.${kbName}.index`, 'index', sections);
}
```

**New API:**
```js
export async function readWikiIndex(kbName) {
  const index = await dbGet(`wiki.${kbName}.index`, 'index');
  if (index) return index;
  return `# ${kbName}\n\n## Entities\n\n## Concepts\n\n## Sources\n\n## Synthesis\n`;
}

export async function updateWikiIndex(kbName, markdown) {
  await dbSet(`wiki.${kbName}.index`, 'index', markdown);
}
```

**Rules:**
- The return type changes from `Object` to `String`.
- The default empty index is a markdown string with the four standard sections.
- No JSON structure is stored.

**Acceptance Criteria:**
- [ ] `readWikiIndex` returns a markdown string.
- [ ] `updateWikiIndex` stores a markdown string.
- [ ] `dbGet`/`dbSet` calls use the same keys (`wiki.${kbName}.index:index`).

---

## Task 0.3: Rewrite `appendWikiLog`

In `src/lib/wikiStore.js`, change the log from an array of objects to a markdown string:

**Current API:**
```js
export async function appendWikiLog(kbName, entry) {
  const logs = (await dbGet(`wiki.${kbName}.log`, 'entries')) || [];
  logs.push({ timestamp: new Date().toISOString(), entry });
  await dbSet(`wiki.${kbName}.log`, 'entries', logs);
}
```

**New API:**
```js
export async function appendWikiLog(kbName, entry) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].slice(0, 5);
  const logLine = `## [${date} ${time}] ${entry}\n`;
  const existing = (await dbGet(`wiki.${kbName}.log`, 'entries')) || `# Log: ${kbName}\n`;
  await dbSet(`wiki.${kbName}.log`, 'entries', existing + '\n' + logLine);
}
```

**Rules:**
- Each entry starts with `## [YYYY-MM-DD HH:MM] action | description`
- The log is a single markdown string, not an array.
- The heading format is parseable by unix tools (`grep "^## \\[" log.md`).

**Acceptance Criteria:**
- [ ] `appendWikiLog` appends a markdown line to a string.
- [ ] The log format matches the gist's recommendation: `## [date time] action | description`.
- [ ] Multiple calls to `appendWikiLog` produce a growing markdown document.

---

## Task 0.4: Create `parseIndex` Utility

Ensure `src/knowledge/wiki-page.js` has a robust `parseIndex(text)` function that takes a markdown `index.md` string and returns the structured `{ entities, concepts, sources, synthesis }` object. This function already exists; verify it handles edge cases:

- Empty sections
- Pages with summaries containing em-dashes or hyphens
- Pages with `[[wikilink]]` syntax
- Extra whitespace

Add unit tests or manual verification using the demo data `index.md` files.

**Acceptance Criteria:**
- [ ] `parseIndex` correctly parses `data/kb-business-registry/wiki/index.md` into the expected structure.
- [ ] `parseIndex` handles empty sections gracefully.
- [ ] `parseIndex` preserves page titles exactly (no truncation or mangling).

---

## Task 0.5: Update `demoLoader.js`

In `src/lib/demoLoader.js`, change how demo data is loaded into IndexedDB:

**Current behavior:**
```js
const sections = { entities: [], concepts: [], sources: [], synthesis: [] };
for (const page of bundle.pages) {
  const section = page.type + 's';
  if (sections[section]) {
    sections[section].push({ title: page.title, summary: '' });
  }
}
await updateWikiIndex(kbName, sections);
```

**New behavior:**
Instead of building a JSON `sections` object, construct a markdown string programmatically or load the pre-authored `index.md` from the demo bundle. The `public/demo-data/*.json` bundles should ideally contain an `indexMd` field (a string). If they don't, build the markdown string from the pages array:

```js
let indexMd = `# ${kbName}\n`;
for (const section of ['entities', 'concepts', 'sources', 'synthesis']) {
  indexMd += `\n## ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
  const items = bundle.pages.filter((p) => p.type + 's' === section);
  for (const item of items) {
    indexMd += `- [[${item.title}]]\n`;
  }
}
await updateWikiIndex(kbName, indexMd);
```

For the log, initialize it as a markdown string:
```js
await dbSet(`wiki.${kbName}.log`, 'entries', `# Log: ${kbName}\n\n## [${new Date().toISOString().split('T')[0]}] setup | Demo data loaded\n`);
```

**Acceptance Criteria:**
- [ ] `demoLoader.js` stores `index.md` as a markdown string.
- [ ] `demoLoader.js` initializes `log.md` as a markdown string.
- [ ] Loading demo data and then opening WikiViewer shows the correct sidebar structure.

---

## Task 0.6: Update `WikiViewer.jsx` Sidebar

In `src/ui/components/WikiViewer.jsx`, the sidebar currently reads `index.entities`, `index.concepts`, etc. from a JSON object. Update it to:

1. Call `readWikiIndex(kbName)` to get the markdown string.
2. Call `parseIndex(markdown)` to get the structured object.
3. Use the structured object to render the sidebar (no change to rendering logic).

**Acceptance Criteria:**
- [ ] `WikiViewer` sidebar renders correctly after loading demo data.
- [ ] Clicking a page title in the sidebar loads the correct page.

---

## Task 0.7: Update All Agent Index Consumers

Update every agent that calls `readWikiIndex` to receive a markdown string and, if needed, parse it:

**Agents to update:**
- `src/agents/relevance-scorer.js` — **This is the most critical agent for the index-first architecture.** It currently builds `indexContent` by iterating JSON sections. It must now receive the raw markdown string directly and pass it to the LLM prompt without parsing.
- `src/agents/swarm-orchestrator.js` — same pattern.
- `src/agents/question-router.js` — **This agent also reads only indexes to route questions.** It must receive raw markdown strings from all active bases.

**Current pattern (relevance-scorer.js):**
```js
const indexSections = await readWikiIndex(kb);
let indexContent = '';
for (const [section, items] of Object.entries(indexSections)) {
  indexContent += `## ${section}\n`;
  for (const item of items) {
    indexContent += `- ${item.title}...\n`;
  }
}
```

**New pattern (index-first architecture):**
```js
const indexContent = await readWikiIndex(kb);
// indexContent is already a markdown string. Pass it directly to the prompt.
// The LLM reads the index catalog to decide relevance. No entity pages are loaded.
```

This is a simplification — the agents no longer need to stringify JSON into markdown because the index is already markdown. More importantly, it enforces the architectural boundary: **the Relevance Scorer and Question Router never read individual wiki pages. They only read indexes.**

**Acceptance Criteria:**
- [ ] `relevance-scorer.js` passes the raw markdown index to its LLM prompt (no JSON parsing, no page loading).
- [ ] `swarm-orchestrator.js` passes the raw markdown index to its LLM prompt.
- [ ] `question-router.js` passes the raw markdown index from all active bases to its LLM prompt (no page loading).
- [ ] The investigation flow still produces correct relevance scores and evidence bundles.
- [ ] **No agent in the relevance-scoring or routing path loads individual entity/concept/source pages.**

---

## Task 0.8: Update `lint.js`

In `src/lib/lint.js`, update the lint logic to work with the markdown index:

**Current:**
```js
const index = await readWikiIndex(kbName); // returns JSON
const allIndexed = new Set([
  ...(index.entities || []).map((i) => i.title),
  ...(index.concepts || []).map((i) => i.title),
  ...(index.sources || []).map((i) => i.title),
  ...(index.synthesis || []).map((i) => i.title),
]);
```

**New:**
```js
const indexMd = await readWikiIndex(kbName); // returns markdown string
const index = parseIndex(indexMd); // parse to structured object
const allIndexed = new Set([
  ...(index.entities || []).map((i) => i.title),
  ...(index.concepts || []).map((i) => i.title),
  ...(index.sources || []).map((i) => i.title),
  ...(index.synthesis || []).map((i) => i.title),
]);
```

The rest of the lint logic remains structurally the same for this sprint. Semantic lint comes in Sprint 4.

**Acceptance Criteria:**
- [ ] `lint.js` parses the markdown index before analyzing.
- [ ] Running lint on demo data produces the same results as before.

---

## Task 0.9: Update `WikiManager.jsx` Index Display

In `src/ui/components/WikiManager.jsx`, the index is displayed as counts:
```jsx
Entities: {index.entities?.length || 0} | Concepts: {index.concepts?.length || 0} | Sources: {index.sources?.length || 0}
```

Update this to parse the markdown index first:
```jsx
const parsed = parseIndex(index);
Entities: {parsed.entities?.length || 0} | Concepts: {parsed.concepts?.length || 0} | Sources: {parsed.sources?.length || 0}
```

**Acceptance Criteria:**
- [ ] `WikiManager` shows correct counts after selecting a knowledge base.

---

## Sprint 0 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] `npm run build` completes without errors.
- [ ] Demo data loads correctly.
- [ ] WikiViewer renders the sidebar from markdown index.
- [ ] Investigation flow (TipEntry → Graph) works end-to-end.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 1.**

**Do not proceed to Sprint 1 until all acceptance criteria have been met.**
