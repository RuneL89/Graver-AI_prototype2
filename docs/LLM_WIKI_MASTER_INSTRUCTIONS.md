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
   - Created and updated by the coding agent, not the journalist-facing UI.

3. **Schema** (`/data/kb-{name}/schema.md`)
   - Per-knowledge-base conventions governing page types, ingest rules, query behavior, citation format, and verification thresholds.

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
3. Run `npm run ingest --kb=kb-{name} --source=raw/filename.ext`.
4. Update `/data/kb-registry/index.md` with the new base entry.

---

## 4. When to Update an Existing Wiki

A wiki is updated in the following situations:

- **New raw sources added:** Run Ingest on the new source.
- **Contradictions discovered during Lint:** Resolve contradictions by updating affected pages, adding contradiction registers, and sourcing the conflict.
- **Schema evolution:** Update `schema.md`, then run Lint to identify pages needing alignment.

**Important:** Updates are performed by the coding agent, not at runtime by the UI.

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
- Stored in `/wiki/sources/` or referenced from entity pages.

### 5.4 Synthesis Pages
- Generated analysis combining multiple sources.
- Stored in `/wiki/synthesis/`.

### 5.5 Special Files
- **`index.md`:** Content catalog. Categorized list of all pages with one-line summaries and wikilinks.
- **`log.md`:** Append-only chronological record of all ingests, queries, and lint passes.

---

## 6. Cross-Reference Convention

- All inter-page links use `[[wikilink]]` syntax.
- Every entity page must have a **Connections** section with bidirectional links.
- When page A links to page B, page B should also link back to page A.

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

## 8. Ingest Workflow

1. **Read raw source** (text, CSV, JSON, or parsed PDF).
2. **Discuss key takeaways** (internally or via LLM prompt).
3. **Write source summary** page.
4. **Update `index.md`** with new page entries.
5. **Update all relevant entity and concept pages**, adding cross-references.
6. **Append operation entry to `log.md`.**

One source may touch 10–15 wiki pages.

---

## 9. Query Workflow

1. **Read `index.md`** to identify relevant pages.
2. **Read identified pages** (entity, concept, source summaries).
3. **Synthesize answer** with `[[wikilink]]` citations.
4. Return structured response to the calling agent.

---

## 10. Lint Workflow

Run `npm run lint --kb=kb-{name}` to scan for:

- **Contradictions:** Conflicting claims between pages or sources.
- **Stale claims:** Information that may be outdated based on newer sources.
- **Orphan pages:** Pages with no incoming wikilinks.
- **Missing concept pages:** Entities that reference concepts without corresponding concept pages.
- **Data gaps:** Entities mentioned in sources but lacking entity pages.

Output: A human-readable report suggesting fixes or new sources.

---

## Appendix: Adaptations from Karpathy's LLM Wiki

- **Multiple wikis:** One per knowledge base rather than a single personal wiki.
- **Per-base schema:** Each domain has its own `schema.md`.
- **Parallel swarm query:** Agents query multiple wikis simultaneously.
- **Connection Agent:** Cross-wiki synthesis layer not present in the original pattern.
- **Verification Agent:** Domain-specific lint pass on journalist-facing output.
