# LLM Wiki Fix Plan
## Implementation Plan: Aligning the Prototype with Karpathy's LLM Wiki Pattern

**Project:** AI-Assisted Investigative Journalism Prototype  
**Version:** 1.2 (Wiki Architecture Retrofit)  
**Date:** 2026-05-29  
**Status:** In Progress  
**Companion Documents:**
- `FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md` — Functional Requirements Document
- `docs/LLM_WIKI_MASTER_INSTRUCTIONS.md` — LLM Wiki System Instructions
- Karpathy's LLM Wiki Gist (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Reference Pattern

---

## Executive Summary

The current prototype implements the *vocabulary* of Karpathy's LLM Wiki pattern (entities, concepts, sources, synthesis, `[[wikilink]]`, frontmatter) but not its *architecture*. The wiki is stored as JSON objects in IndexedDB, ingestion is performed by regex heuristics with zero LLM involvement, the schema is a passive textarea unused by agents, and investigation answers are displayed in the UI but never written back to the wiki. The wiki is a read-only database, not a compounding artifact maintained by the LLM.

This plan retrofits the existing codebase across **five sprints** to align with the gist's core principles:

1. **The wiki is a collection of markdown documents** (`index.md`, `log.md`, entity pages, concept pages, synthesis pages) — not a JSON database.
2. **The LLM maintains the wiki** — ingestion, cross-referencing, contradiction flagging, and index updates are performed by LLM agents, not regex. The index is the primary interface: the Relevance Scoring Agent reads *only* `index.md` to select wikis for the swarm.
3. **The schema is active configuration** — it is injected into every LLM prompt that touches the wiki, governing page types, citation formats, and verification thresholds.
4. **Investigations compound the wiki** — answers from the Writing Agent and Question Router are filed back into the wiki as synthesis pages.
5. **Lint is semantic health-checking** — contradictions, stale claims, orphan pages, missing concepts, and data gaps are detected by the LLM, not just structural checks.

All changes remain **client-side** (browser + IndexedDB + fetch to LLM API). No backend server is introduced. Token costs and context-window limits are addressed explicitly in the plan.

---

## Root Cause Recap

The current codebase diverges from the gist in five dimensions:

| Dimension | Gist | Current | Impact |
|-----------|------|---------|--------|
| **Storage** | Directory of `.md` files | IndexedDB JSON blobs | Agents cannot read `index.md` as markdown; no file-based semantics |
| **Ingestion** | LLM reads source, writes 10-15 pages | Regex extracts 10 names, writes stubs | Pages are empty boilerplate; no summarization or contradiction detection |
| **Schema** | `AGENTS.md` / `CLAUDE.md` system prompt | Textarea editable by user, never read by agents | Agents have no domain guidance; behavior is generic |
| **Query** | Read wiki → synthesize → **file back** | Read wiki → synthesize → **display in UI only** | Knowledge is lost after each session; wiki does not compound |
| **Lint** | Semantic (contradictions, stale claims, gaps) | Structural (orphans, missing refs only) | Wiki health degrades silently as it grows |

### The Index-First Architecture

The user's core vision is that **the Relevance Scoring Agent reads only the `index.md` files** to decide which wikis are relevant to the investigative tip. The swarm agents then read the full pages within the selected wikis. This is already how the current code works, and the fix plan preserves and strengthens it:

- **Sprint 0** converts the index from JSON to markdown, making it a first-class document that the LLM reads as context.
- **Sprint 1** injects the schema into the Relevance Scorer's prompt, giving it domain-specific guidance for ranking.
- **Sprint 2** ensures the LLM writes **rich one-line summaries** into the index during ingestion, so the scorer has enough signal.
- The swarm agents (`researchAgent`, `question-router`) continue to drill into full pages *after* the scorer has selected the bases.

**Implication:** The `index.md` is the most critical document in the system. Its quality (descriptive summaries, complete coverage) directly determines the accuracy of relevance scoring.

---

## Sprint Sequence

| Sprint | Folder | Focus | Key Deliverable |
|--------|--------|-------|-----------------|
| Sprint 0 | `sprint-0-data-model-migration/` | Convert index/log from JSON to markdown; update all readers | `index.md` and `log.md` are stored and parsed as markdown strings |
| Sprint 1 | `sprint-1-schema-as-configuration/` | Inject schema into every agent prompt; validate schema usage | Every agent receives the kb schema as its system prompt prefix |
| Sprint 2 | `sprint-2-llm-driven-ingestion/` | Replace regex ingestion with LLM-driven pipeline | Uploading a document triggers LLM processing; produces rich pages |
| Sprint 3 | `sprint-3-writeback-and-compounding/` | Persist investigation answers as wiki synthesis pages | Writing Agent and Question Router outputs can be filed to wiki |
| Sprint 4 | `sprint-4-rich-lint-and-links/` | Semantic lint + bidirectional link maintenance | Lint detects contradictions and stale claims; backlinks are maintained |
| Sprint 5 | `sprint-5-integration-testing-docs/` | End-to-end testing, demo data refresh, documentation | Full flow verified; README updated; demo script updated |

---

## Cross-Cutting Constraints

These constraints apply to all sprints:

1. **Client-Side Only:** All code runs in the browser. No Node.js backend, no server-side API endpoints, no file system access outside IndexedDB.
2. **IndexedDB Retained:** The storage engine remains IndexedDB. We store markdown *strings* in IndexedDB rather than JSON objects. This gives us file-like semantics without fighting the browser sandbox.
3. **LLM API Dependency:** Sprint 2 introduces a hard dependency on a configured LLM API (see FR-107). Ingestion will fail without `apiBaseUrl` and `modelName`. The UI must enforce this.
4. **Session Isolation Preserved:** Every agent still instantiates its own `LLMClient` per FR-301 through FR-306. The ingest pipeline (new in Sprint 2) must also use isolated sessions.
5. **Demo Data Compatibility:** Existing demo data in `public/demo-data/*.json` and `data/kb-*/wiki/` must continue to load correctly. Sprint 0 changes how demo data is stored in IndexedDB, but the source JSON format can remain.
6. **No UI Wiki Editing:** Per FRD Section 4.2 and existing Sprint Instructions, the journalist-facing UI does not create or edit wiki pages. All wiki writes are performed by agents or coding-agent scripts. The `WikiManager` UI remains read-only for schema viewing and lint triggering only.
7. **Backward Compatibility:** Existing investigation flow (TipEntry → Relevance Scorer → Swarm → Connection Agent → Graph) must continue to work after each sprint. Each sprint is a additive retrofit, not a rewrite.

---

## Detailed Sprint Specifications

---

### Sprint 0: Data Model Migration — Markdown-ize the Index and Log

**Goal:** Convert the runtime representation of `index.md` and `log.md` from structured JSON to markdown strings, update all code that reads or writes them, and ensure the `WikiViewer` can parse and render the markdown index.

**Current State:**
- `readWikiIndex()` returns `{ entities: [], concepts: [], sources: [], synthesis: [] }` (JSON)
- `updateWikiIndex()` stores a JSON object
- `appendWikiLog()` stores an array of `{ timestamp, entry }` objects
- `WikiViewer.jsx` reads the JSON index to build its sidebar
- `demoLoader.js` parses static `index.md` markdown into JSON, then stores JSON
- Agents receive JSON index content in their prompts

**Target State:**
- `readWikiIndex()` returns a markdown string (the content of `index.md`)
- `updateWikiIndex()` stores a markdown string
- `appendWikiLog()` appends a markdown line to `log.md`
- `WikiViewer.jsx` parses the markdown index to build its sidebar
- `demoLoader.js` stores the raw markdown string directly
- Agents receive the raw `index.md` markdown in their prompts

**Critical for the Index-First Architecture:** The Relevance Scoring Agent consumes `index.md` directly as markdown text. It does not parse the index into JSON. It passes the raw markdown to its LLM prompt. This makes the index the single source of truth for wiki selection.

**Files Modified:**
- `src/lib/wikiStore.js` — change `readWikiIndex`, `updateWikiIndex`, `appendWikiLog`
- `src/lib/wiki-page.js` — `parseIndex(text)` already parses markdown; ensure it is used
- `src/lib/demoLoader.js` — store markdown strings instead of JSON
- `src/ui/components/WikiViewer.jsx` — parse markdown index for sidebar
- `src/ui/components/WikiManager.jsx` — display markdown index preview if needed
- `src/agents/relevance-scorer.js` — **consume markdown index directly** (index-first architecture)
- `src/agents/swarm-orchestrator.js` — read markdown index, not JSON
- `src/agents/question-router.js` — **consume markdown index directly** (index-first architecture)
- `src/lib/lint.js` — read markdown index, not JSON

**Acceptance Criteria:**
- [ ] `readWikiIndex('kb-business-registry')` returns a markdown string matching the structure of `data/kb-business-registry/wiki/index.md`
- [ ] `appendWikiLog('kb-business-registry', 'Ingested file.pdf')` appends a parseable markdown entry to `log.md`
- [ ] `WikiViewer.jsx` sidebar correctly renders sections from the markdown index
- [ ] `demoLoader.js` loads demo data without converting index to JSON
- [ ] All agents that previously consumed `readWikiIndex()` still function (they now receive markdown strings as prompt context)
- [ ] **The Relevance Scoring Agent receives raw markdown index strings and passes them directly to its LLM prompt (no JSON parsing).**
- [ ] **The Question Router receives raw markdown index strings from all active bases and passes them directly to its LLM prompt.**
- [ ] The existing investigation flow (TipEntry → Graph) continues to work end-to-end

---

### Sprint 1: Schema as Active Configuration

**Goal:** Make the per-knowledge-base schema an active configuration document that is injected into every LLM prompt that operates on the wiki. Agents must read the schema and use it to govern their behavior.

**Current State:**
- Schema is stored as a markdown string in IndexedDB (`wiki.${kbName}.meta:schema`)
- Schema is editable in `WikiManager.jsx` via a `<textarea>`
- **No agent imports or reads the schema**
- Agent prompts are hard-coded generic instructions

**Target State:**
- Every agent that interacts with a KB receives the schema markdown as the first part of its system prompt
- A helper function `buildSystemPrompt(kbName, baseSystemPrompt)` reads the schema and concatenates it
- The schema governs: page types, ingest rules, citation format, verification thresholds, query behavior
- **The Relevance Scoring Agent uses the schema to understand domain-specific relevance signals** (e.g. a schema rule that procurement bases are high-priority for government-contract tips directly affects scoring)

**Files Modified:**
- `src/lib/wikiStore.js` — ensure `getSchema()` is exported and cached
- `src/shared/llm-client.js` or new `src/shared/schema-loader.js` — helper to inject schema
- `src/agents/relevance-scorer.js` — prepend schema to prompt
- `src/agents/swarm-orchestrator.js` — prepend schema to prompt
- `src/agents/connection-agent.js` — prepend schema to prompt
- `src/agents/writing-agent.js` — prepend schema to prompt (minimal change; agent is insulated from wiki format by swarm bundles)
- `src/agents/verification-agent.js` — prepend schema to prompt
- `src/agents/question-router.js` — prepend schema to prompt
- `src/lib/ingest.js` — prepend schema to prompt (preparation for Sprint 2)
- `src/ui/components/WikiManager.jsx` — display schema read-only (remove edit capability or keep it with a warning)

**Acceptance Criteria:**
- [ ] A helper function exists that, given a `kbName`, returns the schema markdown string
- [ ] Every agent's LLM prompt includes the schema as its system prompt prefix
- [ ] Changing a schema in `WikiManager` and re-running an investigation produces different agent behavior (e.g. a schema that says "flag all address matches" causes the Verification Agent to flag address matches)
- [ ] The schema from `data/kb-business-registry/schema.md` is loaded into IndexedDB during demo data loading
- [ ] `lint.js` reports if a KB has no schema configured

---

### Sprint 2: LLM-Driven Ingestion

**Goal:** Replace the regex-based `ingestDocument` with an LLM-driven pipeline that reads the raw source, existing wiki pages, and schema; then produces updated entity pages, concept pages, source summaries, index updates, and log entries.

**Current State:**
- `ingestDocument(kbName, file)` runs regex, slices 2000 chars, writes stubs
- No LLM calls
- No loading state in UI
- Works offline without API key

**Target State:**
- `ingestDocument(kbName, file, config)` calls the LLM to process the document
- The LLM receives: schema, current `index.md`, current entity pages (or summaries), and the raw text
- The LLM returns structured updates: new/updated pages, updated `index.md`, `log.md` entry
- The function writes all updates transactionally (or rolls back on failure)
- `DocumentUploader.jsx` shows per-file progress and handles errors
- Upload is blocked if no LLM config is present

**Files Modified:**
- `src/lib/ingest.js` — complete rewrite of `ingestDocument`
- `src/ui/components/DocumentUploader.jsx` — add progress states, config validation, error display
- `src/shared/llm-client.js` — potentially add streaming or progress callbacks
- `src/lib/wikiStore.js` — add transactional helper `batchWriteWikiPages(kbName, operations)`
- `src/ui/store.jsx` — add `ingestionStatus` state (idle / extracting / analyzing / writing / done / error)

**Ingestion Pipeline Design:**

```
User drops file
  → DocumentUploader validates LLM config exists
  → Extract text via rawVault (PDF → pdfjs-dist, text → file.text())
  → Read current schema + index.md + sample of existing pages
  → LLM Prompt:
      "Schema: {schema}
       Current index: {indexMd}
       Existing entities: {entityTitles}
       New source text: {rawText}
       
       Please process this source. Return JSON:
       {
         sourcePage: { title, content },
         entityPages: [{ title, content }],
         conceptPages: [{ title, content }],
         updatedIndex: string,
         logEntry: string
       }
       
       CRITICAL: The updatedIndex must contain descriptive one-line summaries 
       for every entry. The Relevance Scoring Agent reads only the index to 
       decide which wikis are relevant to a journalist's tip."
  → Parse LLM response
  → Validate all titles are safe strings
  → Batch write to IndexedDB:
      - Save source page
      - Save/update entity pages
      - Save/update concept pages
      - Update index.md
      - Append logEntry to log.md
  → Update React store
  → Show success / error
```

**Error Handling Requirements:**
- Network errors: retry up to 2 times with exponential backoff
- LLM returns invalid JSON: show error, do not write partial data
- LLM context window exceeded: chunk the document and process in multiple passes
- Any failure during the write phase: roll back all writes for this document

**Chunking Strategy for Large Documents:**
- If raw text > 50,000 chars, split into chunks of ~20,000 chars with 2,000 char overlap
- Process chunk 1 with LLM (creates initial pages)
- Process chunk 2 with LLM, providing the output from chunk 1 as context (updates existing pages)
- Continue until all chunks processed
- Final pass: ask LLM to reconcile all chunk outputs into a consistent set of pages

**Acceptance Criteria:**
- [ ] Uploading a PDF or text file without LLM config shows: "Please configure LLM API in Settings first"
- [ ] Uploading a document shows progress: "Extracting text… → Analyzing with LLM… → Updating wiki… → Done"
- [ ] After upload, the wiki contains a source summary page with actual summarization (not just a 2000-char slice)
- [ ] After upload, entity pages contain meaningful extracted information (not just "Mentioned in filename")
- [ ] After upload, `index.md` is updated with new entries
- [ ] After upload, `log.md` contains a parseable entry
- [ ] Failed ingests do not leave the wiki in a partially updated state
- [ ] The existing regex ingest is either removed or moved to a `legacyIngest` fallback function
- [ ] Token cost is logged to the console for transparency

---

### Sprint 3: Writeback and Compounding

**Goal:** Allow investigation answers to be filed back into the wiki as synthesis pages.

**Note on the Writing Agent:** The Writing Agent requires only **minor enhancement** in this sprint: optionally returning a `suggestedMarkdown` field formatted as a synthesis page. No structural changes to its core drafting logic are needed. The swarm bundles already provide it with markdown content. The Writing Agent's paragraphs and the Question Router's answers can be persisted, making the wiki grow through queries as well as ingests.

**Current State:**
- `writing-agent.js` returns `{ paragraph, citations }` to the UI
- `question-router.js` returns `{ bundles, graph }` to the UI
- Note-blocks accumulate in React state (`state.noteBlocks`)
- Export as Markdown downloads the note-blocks
- Nothing is written to the wiki

**Target State:**
- After the Writing Agent produces a paragraph, the UI offers a "File to Wiki" button
- After the Question Router answers a question, the UI offers a "Save Answer to Wiki" button
- Filed content becomes a `synthesis` page in the wiki
- The `index.md` is updated with the new synthesis page
- The `log.md` is updated with a query entry

**Files Modified:**
- `src/agents/writing-agent.js` — optionally return a suggested page title and full markdown content
- `src/agents/question-router.js` — optionally return a suggested synthesis page
- `src/ui/components/VerificationDashboard.jsx` — add "File to Wiki" button for verified blocks
- `src/ui/components/NoteBlockComposer.jsx` — add "File to Wiki" button per block or for the entire composer
- `src/ui/components/ClarifyingQuestionTerminal.jsx` — add "Save Answer" button
- `src/lib/wikiStore.js` — add `saveSynthesisPage(kbName, title, content, citations)` helper
- `src/ui/store.jsx` — add actions for wiki writeback

**Synthesis Page Format:**
```markdown
---
type: synthesis
date_created: 2026-05-29
source_count: 3
status: active
---

# Analysis: Director Y's Cross-Source Connections

## Question
Does Director Y link Company X to sanctioned entities?

## Answer
[Writing Agent paragraph here]

## Evidence
- [[kb-business-registry]]: Director Y is listed as director of Company X (business_registry_q1_2026)
- [[kb-sanctions]]: Director Y appears on the sanctions list (sanctions_list_march_2026)

## Citations
- [[Jens Hansen]] — Director
- [[NorthStar Procurement Inc]] — Company
```

**Acceptance Criteria:**
- [ ] The Verification Dashboard shows a "File to Wiki" button next to each verified note-block
- [ ] Clicking "File to Wiki" creates a `synthesis` page in the active knowledge base(s)
- [ ] The synthesis page includes the original question, the answer paragraph, and citations
- [ ] The wiki `index.md` is updated with the new synthesis page entry
- [ ] The `log.md` records the query and the filing action
- [ ] The Note-Block Composer shows which blocks have been filed to the wiki
- [ ] The Clarifying Question Terminal shows a "Save Answer to Wiki" button
- [ ] Synthesis pages appear in the WikiViewer sidebar under a "Synthesis" section
- [ ] The existing export-to-markdown feature still works independently

---

### Sprint 4: Rich Lint and Bidirectional Links

**Goal:** Replace structural lint with LLM-driven semantic lint that detects contradictions, stale claims, orphan pages, missing concepts, and data gaps. Implement bidirectional link maintenance so that `[[wikilink]]` references are kept consistent.

**Current State:**
- `lint.js` checks: orphan pages, missing referenced pages
- No contradiction detection
- No stale claim detection
- No missing concept detection
- No data gap detection
- Links are unidirectional (Page A links to Page B, but Page B is not updated)

**Target State:**
- `lintWiki(kbName, config)` is an LLM agent that performs semantic analysis
- It reads schema + index.md + sample of pages
- It reports: contradictions, stale claims, orphans, missing concepts, data gaps, broken links
- It suggests specific fixes (e.g. "Update Entity Page X to reflect new source Y")
- `WikiManager.jsx` displays lint suggestions with "Apply Fix" buttons (coding-agent level, not journalist UI)
- Backlinks are maintained: when Page A references `[[Page B]]`, Page B's Connections section is updated to reference `[[Page A]]`

**Files Modified:**
- `src/lib/lint.js` — complete rewrite as LLM-driven semantic lint
- `src/lib/wikiStore.js` — add `maintainBacklinks(kbName, sourceTitle, targetTitles)` helper
- `src/lib/ingest.js` — call backlink maintenance after creating/updating pages
- `src/ui/components/WikiManager.jsx` — display lint report with suggestion severity (info/warning/error)
- `src/agents/` — potentially create a dedicated `lint-agent.js`

**Lint Prompt Design:**
```
You are a wiki health checker.
Schema: {schema}
Current index: {indexMd}
Pages to review: {sampleOfPageContents}
Log: {logMd}

Please analyze this wiki and return JSON:
{
  contradictions: [{ pages, claimA, claimB, severity }],
  staleClaims: [{ page, claim, newerSource, severity }],
  orphans: [{ page, reason }],
  missingConcepts: [{ concept, mentionedIn }],
  dataGaps: [{ entity, missingField, suggestedSource }],
  brokenLinks: [{ page, deadLink }],
  suggestions: [{ action, targetPage, details }]
}
```

**Backlink Maintenance:**
- After any page write (ingest or writeback), scan the page content for `[[Title]]` links
- For each link target, load the target page
- If the target page's Connections section does not already reference the source page, append it
- Save the updated target page

**Acceptance Criteria:**
- [ ] Running lint on `kb-business-registry` detects at least one contradiction or stale claim in the demo data (the demo data contains intentional overlaps)
- [ ] Lint suggestions include specific page names and recommended actions
- [ ] After uploading a document that mentions "Jens Hansen" and "Oceanic Logistics Ltd", both entity pages have bidirectional Connections links
- [ ] After filing a synthesis page that references an entity, the entity page's Connections section includes the synthesis page
- [ ] The lint report distinguishes between structural issues (orphans, broken links) and semantic issues (contradictions, stale claims)
- [ ] Lint results are logged to `log.md`
- [ ] The WikiManager UI shows lint severity with color coding (green/yellow/red)

---

### Sprint 5: Integration, Testing, and Documentation

**Goal:** Verify the full end-to-end flow works with the new LLM-driven wiki architecture. Update demo data if needed. Refresh documentation.

**End-to-End Test Flow:**
1. Configure LLM API
2. Load demo data (verify old data still loads)
3. Upload a new document to `kb-demo` (verify LLM ingestion)
4. Enter a tip and start investigation (verify agents use markdown index)
5. Click a graph edge, draft a paragraph, verify it (verify Writing Agent uses schema)
6. File the paragraph to the wiki as a synthesis page (verify writeback)
7. Run lint (verify semantic lint finds issues)
8. Open WikiViewer, verify the new synthesis page appears with correct markdown rendering
9. Verify `[[wikilink]]` navigation works bidirectionally
10. Export the investigation as markdown (verify export still works)

**Files Modified:**
- `README.md` — update technical architecture section to describe markdown wiki, LLM ingestion, schema injection, writeback, and semantic lint
- `docs/demo-script.md` — update demo steps to include document upload, wiki viewer, and lint
- `docs/LLM_WIKI_MASTER_INSTRUCTIONS.md` — update to reflect the new runtime architecture
- `package.json` — no changes expected unless new dependencies were added in earlier sprints
- `src/ui/components/App.jsx` — verify routing/state still works

**Acceptance Criteria:**
- [ ] The full end-to-end test flow completes without errors
- [ ] The WikiViewer displays pages with proper markdown rendering and clickable `[[wikilink]]` links
- [ ] The demo script accurately describes the current prototype behavior
- [ ] The README explains the LLM Wiki architecture to a new developer
- [ ] All sprints' acceptance criteria are re-verified and passing
- [ ] A final `npm run build` produces no errors
- [ ] **Final Step: Run `/compact`.**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM API rate limits during ingestion | High | Medium | Implement retry with exponential backoff; chunk large documents; show clear error messages |
| LLM produces invalid JSON during ingest | Medium | High | Validate JSON before writing; roll back on failure; show raw response to user |
| Context window exceeded by large PDFs | Medium | High | Implement chunking strategy; send document summaries, not full text, when possible |
| Token costs become prohibitive | Medium | Medium | Log token usage; allow users to preview cost before ingest; keep regex as optional fallback |
| Markdown index becomes too large for LLM prompt | Low | Medium | Truncate index to most recent/relevant entries; add pagination or summary |
| Bidirectional link maintenance causes infinite loops | Low | High | Only append links that don't already exist; never auto-update the source page from the target page |
| Browser storage limits (IndexedDB) | Low | Low | Warn user if storage > 50MB; offer purge old raw sources option |

---

## Appendix A: Files Changed by Sprint

### Sprint 0
- `src/lib/wikiStore.js`
- `src/lib/wiki-page.js`
- `src/lib/demoLoader.js`
- `src/ui/components/WikiViewer.jsx`
- `src/ui/components/WikiManager.jsx`
- `src/agents/relevance-scorer.js`
- `src/agents/swarm-orchestrator.js`
- `src/agents/question-router.js`
- `src/lib/lint.js`

### Sprint 1
- `src/lib/wikiStore.js`
- `src/shared/llm-client.js` or new `src/shared/schema-loader.js`
- `src/agents/relevance-scorer.js`
- `src/agents/swarm-orchestrator.js`
- `src/agents/connection-agent.js`
- `src/agents/writing-agent.js` (schema injection only; minimal change)
- `src/agents/verification-agent.js`
- `src/agents/question-router.js`
- `src/lib/ingest.js`
- `src/ui/components/WikiManager.jsx`

### Sprint 2
- `src/lib/ingest.js`
- `src/ui/components/DocumentUploader.jsx`
- `src/shared/llm-client.js`
- `src/lib/wikiStore.js`
- `src/ui/store.jsx`

### Sprint 3
- `src/agents/writing-agent.js` (return suggestedMarkdown; core logic unchanged)
- `src/agents/question-router.js`
- `src/ui/components/VerificationDashboard.jsx`
- `src/ui/components/NoteBlockComposer.jsx`
- `src/ui/components/ClarifyingQuestionTerminal.jsx`
- `src/lib/wikiStore.js`
- `src/ui/store.jsx`

### Sprint 4
- `src/lib/lint.js`
- `src/lib/wikiStore.js`
- `src/lib/ingest.js`
- `src/ui/components/WikiManager.jsx`
- Potentially new `src/agents/lint-agent.js`

### Sprint 5
- `README.md`
- `docs/demo-script.md`
- `docs/LLM_WIKI_MASTER_INSTRUCTIONS.md`

---

## Appendix B: Data Format Reference

### index.md (Markdown String)
```markdown
# kb-business-registry

## Entities
- [[Jens Hansen]] — Director of Oceanic Logistics Ltd and NorthStar Procurement Inc
- [[Oceanic Logistics Ltd]] — Shipping company registered in Q1 2026
- [[NorthStar Procurement Inc]] — Government IT contractor

## Concepts
- [[Beneficial Ownership]] — Legal framework for identifying true owners

## Sources
- [[business_registry_q1_2026]] — PDF extract of Q1 2026 registry entries
- [[procurement_contracts_2025]] — CSV of awarded contracts

## Synthesis
- [[Analysis: Director Y's Cross-Source Connections]] — Connection between registry and sanctions data
```

### log.md (Markdown String)
```markdown
# Log: kb-business-registry

## [2026-05-27] ingest | business_registry_q1_2026.pdf
Extracted 12 companies and 8 directors. Created entity pages for Jens Hansen, Oceanic Logistics Ltd, NorthStar Procurement Inc.

## [2026-05-27] ingest | procurement_contracts_2025.csv
Extracted 24 contracts. Updated NorthStar Procurement Inc with contract references.

## [2026-05-28] query | "Company linked to sanctioned directors"
Relevance score: 0.92. Activated for investigation.

## [2026-05-28] lint
Found 1 contradiction: Jens Hansen's registration date differs between registry and sanctions sources.
```

### Entity Page (Markdown String)
```markdown
---
type: entity
date_created: 2026-05-27
source_count: 3
status: active
aliases: "J. Hansen, Director Y"
---

# Jens Hansen

## Summary
Director of both Oceanic Logistics Ltd and NorthStar Procurement Inc. Also known as J. Hansen. Subject of sanctions.

## Connections
- [[Oceanic Logistics Ltd]] — Director
- [[NorthStar Procurement Inc]] — Director
- [[Government IT Services]] — Signatory

## Sources
- [[business_registry_q1_2026]]
- [[sanctions_list_march_2026]] (kb-sanctions)
- [[procurement_contracts_2025]] (kb-procurement)

## Contradictions
- Registration date in registry (2024-03-15) vs sanctions list (2024-03-18). Registry source is primary.
```

---

**End of Implementation Plan**
