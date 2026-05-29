# LLM Wiki Master Instructions

This document governs how the coding agent creates and maintains all knowledge base wikis for the AI-Assisted Investigative Journalism Prototype.

---

## 1. The Three Layers

Every knowledge base consists of three immutable or versioned layers:

1. **Raw Source Vault** (`/data/kb-{name}/raw/`)
   - Immutable original documents: markdown, plain text, CSV, JSON, PDF.
   - No runtime agent modifies these files.
   - PDFs are parsed to extract text during Ingest; the original PDF remains untouched.

2. **Compiled Wiki Layer** (`/data/kb-{name}/wiki/`)
   - LLM-maintained markdown files that compound over time.
   - Contains entity pages, concept pages, synthesis pages, index.md, and log.md.
   - At runtime, these are stored as **markdown strings in IndexedDB**, not files on disk.
   - Created and updated by agents (ingest, writing, question-router, lint), not the journalist-facing UI.

3. **Schema** (`/data/kb-{name}/schema.md`)
   - Per-knowledge-base conventions governing page types, ingest rules, query behavior, citation format, and verification thresholds.
   - Injected into every agent prompt that touches the wiki.

---

## 2. The Wiki-of-Wikis Concept

Because this prototype requires multiple independent knowledge bases (e.g., business registry, sanctions, procurement, customs), a global registry acts as the catalog:

- **Location:** `/data/kb-registry/index.md`
- **Purpose:** Lists every knowledge base with a one-line domain summary and a wikilink to its own `index.md`.
- **Maintenance:** Updated whenever a new knowledge base is created.

---

## 3. When to Create a New Wiki

A new wiki directory (`/data/kb-{name}/wiki/`) is created when a new domain-specific dataset is introduced. The coding agent runs an **Ingest pass** to populate it.

Steps:
1. Create `/data/kb-{name}/raw/` and add source documents.
2. Write `/data/kb-{name}/schema.md` tailored to the domain.
3. At runtime, use the Document Uploader to ingest sources. The LLM processes them and writes pages.
4. Update `/data/kb-registry/index.md` with the new base entry.

---

## 4. When to Update an Existing Wiki

A wiki is updated in the following situations:

- **New raw sources added:** Run Ingest on the new source via Document Uploader.
- **Investigation answers filed:** Use "File to Wiki" or "Save Answer to Wiki" to create synthesis pages.
- **Contradictions discovered during Lint:** Resolve contradictions by updating affected pages, adding contradiction registers, and sourcing the conflict.
- **Schema evolution:** Update `schema.md`, then run Lint to identify pages needing alignment.

**Important:** Wiki writes are performed by agents or coding-agent scripts, not directly by the journalist-facing UI (except for schema edits behind an "Edit" toggle).

---

## 5. Page Types

### 5.1 Entity Pages
- One page per discovered entity (person, company, contract, vessel, etc.).
- Stored in `/wiki/entities/`.
- Must contain: summary, connections section with bidirectional `[[wikilink]]`s, sources section, and contradictions section if applicable.

### 5.2 Concept Pages
- One page per domain abstraction (e.g., "Beneficial Ownership", "Shell Company").
- Stored in `/wiki/concepts/`.
- Links to all related entity pages.

### 5.3 Source Summaries
- One page per raw document summarizing its key contents.
- Stored in `/wiki/sources/`.

### 5.4 Synthesis Pages
- Generated analysis combining multiple sources or investigation answers.
- Stored in `/wiki/synthesis/`.
- Include: original question, analysis paragraph, evidence, key entities, citations.

### 5.5 Special Files
- **`index.md`:** Content catalog. Categorized list of all pages with **descriptive one-line summaries** and wikilinks. This is the primary interface for the Relevance Scoring Agent and Question Router.
- **`log.md`:** Append-only chronological record of all ingests, queries, lint passes, and writeback actions.

---

## 6. Cross-Reference Convention

- All inter-page links use `[[wikilink]]` syntax.
- Every entity page must have a **Connections** section with bidirectional links.
- When page A links to page B, page B should also link back to page A.
- Backlinks are maintained automatically by `maintainBacklinks()` after every page write.

---

## 7. Frontmatter Standard

Every wiki page must include YAML frontmatter with at minimum:

```yaml
---
type: entity | concept | source | synthesis
status: active | stale | deprecated
date_created: YYYY-MM-DD
source_count: 0
---
```

Additional fields are permitted per schema.

---

## 8. Ingest Workflow (LLM-Driven)

1. **Read raw source** (text, CSV, JSON, or parsed PDF).
2. **Read schema and current index.md** from IndexedDB.
3. **Read existing entity titles** to avoid duplicates.
4. **Send LLM prompt** with schema, index, existing entities, and raw text.
5. **LLM returns structured JSON:** source summary, entity pages, concept pages, updated index, log entry.
6. **Validate JSON** and build write operations.
7. **Write transactionally** via `batchWriteWikiPages`.
8. **Maintain backlinks** for all `[[wikilink]]` references.
9. **Update React store** and show completion.

For large documents (>30,000 chars), the text is split into chunks with overlap and processed sequentially.

**Token cost:** Ingestion typically costs ~2K–10K tokens depending on document size. Cost is logged to the console.

---

## 9. Query Workflow

1. **Read `index.md`** to identify relevant pages.
2. **Read identified pages** (entity, concept, source summaries).
3. **Synthesize answer** with `[[wikilink]]` citations.
4. Return structured response to the calling agent.
5. **Optional writeback:** The journalist can file the answer as a synthesis page, updating the index and log.

---

## 10. Lint Workflow (Semantic)

1. **Read schema, index.md, sample pages, and recent log** from IndexedDB.
2. **Send semantic lint prompt** to the LLM.
3. **LLM returns structured JSON** with contradictions, stale claims, orphans, missing concepts, data gaps, broken links, and suggestions.
4. **Display color-coded report** in WikiManager (red/yellow/blue).
5. **Append summary to log.md**.

If no LLM is configured, structural lint (orphans, broken links, schema validation) runs as a fallback.

**Token cost:** Lint typically costs ~3K–8K tokens depending on wiki size. Cost is logged to the console.

---

## 11. Schema Injection

Every agent that interacts with a KB receives the schema as a prefix to its system prompt:

```js
const systemPrompt = await buildAgentSystemPrompt(
  kbName,
  'You search a wiki for evidence related to an investigative tip. Return only JSON.'
);
```

This ensures agents follow domain-specific rules for page types, citations, and verification thresholds.

---

## 12. Bidirectional Link Maintenance

After any page write (ingest or writeback), `maintainBacklinks(kbName, sourceTitle, targetTitles)`:

1. Scans the source page for `[[Title]]` links.
2. For each target, loads the target page.
3. If the target's Connections section does not already reference the source, appends it.
4. Saves the updated target page.

This keeps the wiki graph fully navigable in both directions.

---

## 13. Token Cost Transparency

All LLM-driven operations log estimated token usage:

```
[Ingest] Prompt length: 4500 chars (~1125 tokens estimated)
[LintAgent] Prompt length: 8200 chars (~2050 tokens estimated)
```

Journalists should be aware that uploading documents and running lint now costs money.

---

## Appendix: Adaptations from Karpathy's LLM Wiki

- **Storage:** Markdown strings in IndexedDB instead of files on disk.
- **Multiple wikis:** One per knowledge base rather than a single personal wiki.
- **Per-base schema:** Each domain has its own `schema.md`, injected into every agent prompt.
- **LLM-driven ingest:** Documents are processed by the LLM, not regex heuristics.
- **Writeback:** Investigation answers compound the wiki as synthesis pages.
- **Semantic lint:** The LLM health-checks for contradictions and stale claims, not just structural issues.
- **Bidirectional links:** Backlinks are maintained automatically after every write.
- **Parallel swarm query:** Agents query multiple wikis simultaneously.
- **Connection Agent:** Cross-wiki synthesis layer not present in the original pattern.
- **Verification Agent:** Domain-specific lint pass on journalist-facing output.
