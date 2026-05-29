# Sprint 5: Integration, Testing, and Documentation

**Goal:** Verify the full end-to-end flow works with the new LLM-driven wiki architecture. Update demo data if needed. Refresh all documentation to reflect the new system. Ensure the build is clean and the prototype is demo-ready.

**This is the final sprint of the LLM Wiki Fix Plan. No further sprints follow.**

---

## Task 5.1: End-to-End Flow Test

Manually test the complete Use Case from FRD Section 7, but with the new LLM Wiki architecture:

### Test Flow

1. **Configuration**
   - Open Settings, enter valid LLM API Base URL and Model Name.
   - Verify config is saved and readable by agents.

2. **Demo Data Load**
   - Click "Load Demo Data".
   - Verify all three bases (`kb-business-registry`, `kb-sanctions`, `kb-procurement`) load.
   - Open WikiManager, verify schemas are loaded.
   - Open WikiViewer for each base, verify sidebar shows entities/concepts/sources/synthesis.

3. **Document Ingestion (NEW)**
   - Create a new wiki `kb-test` via WikiManager.
   - Upload a text or PDF document to `kb-test`.
   - Verify progress messages appear (extracting → analyzing → writing → done).
   - Verify the wiki contains:
     - A source summary page (genuine summary, not raw text dump)
     - Entity pages with meaningful content
     - Updated `index.md` with **descriptive one-line summaries** for every entry
     - Updated `log.md`
   - **Index-First Verification:** Open the browser console, verify that `readWikiIndex('kb-test')` returns a markdown string where every entry has a summary after the em-dash.
   - Open WikiViewer, verify new pages render correctly.
   - Click `[[wikilink]]` links, verify navigation works.

4. **Investigation Flow**
   - Enter tip: "Company linked to sanctioned directors in procurement contracts"
   - Click "Start Investigation".
   - Verify Relevance Scoring Agent activates correct bases.
   - Verify Active KB Panel shows justifications.
   - Verify Connection Graph renders with nodes and edges.
   - Click an edge (e.g. Jens Hansen ↔ NorthStar Procurement Inc).
   - Verify Writing Agent drafts a paragraph.
   - Verify Verification Agent checks it (VERIFIED or FLAGGED with reason).

5. **Writeback (NEW)**
   - If block is verified, click "File to Wiki".
   - Select target KB, confirm.
   - Verify synthesis page is created.
   - Open WikiViewer, verify synthesis page appears under Synthesis section.
   - Verify entity pages in the synthesis have backlinks to the synthesis page.

6. **Clarifying Question**
   - Ask: "Does Director Y have other companies?"
   - Verify Question Router dispatches to correct base.
   - Verify graph updates with new connections.
   - Click "Save Answer to Wiki".
   - Verify answer is filed as synthesis page.

7. **Lint (NEW)**
   - Run lint on `kb-business-registry`.
   - Verify semantic issues are found (contradictions, stale claims, or missing concepts).
   - Verify lint report is color-coded in WikiManager.
   - Verify lint results are in `log.md`.

8. **Export**
   - Accept multiple blocks into Composer.
   - Reorder blocks.
   - Click "Export as Markdown".
   - Verify exported file contains all blocks with citations.

9. **Browser Refresh**
   - Refresh the browser.
   - Verify all wiki data persists in IndexedDB (pages, index, log).
   - Verify investigation state resets (tip, graph, composer are session-only).

### Acceptance Criteria
- [ ] All 9 steps complete without errors.
- [ ] No JavaScript errors in browser console.
- [ ] All agent LLM calls succeed (or fail gracefully with fallback heuristics).
- [ ] **The Relevance Scoring Agent identifies the correct wikis using only the `index.md` content (no entity pages loaded).**
- [ ] **Uploaded documents produce index entries with descriptive one-line summaries.**

---

## Task 5.2: Verify Backward Compatibility

Confirm that existing functionality still works exactly as before the fix plan:

- [ ] Tip Entry → Relevance Scorer → Swarm → Graph → Writing Agent → Verification → Composer works.
- [ ] Graph nodes are color-coded by type.
- [ ] Graph edges show provenance on hover.
- [ ] Note-Block Composer can reorder and delete blocks.
- [ ] Export produces valid markdown.
- [ ] Configuration page validates HTTPS URLs.
- [ ] WikiViewer renders markdown with `marked` and handles `[[wikilink]]` clicks.
- [ ] Demo data loads correctly.

---

## Task 5.3: Performance Check

Measure and document performance:

| Operation | Time | Notes |
|-----------|------|-------|
| Demo data load | < 5 seconds | |
| Relevance scoring (3 bases) | < 15 seconds | |
| Swarm execution (3 bases) | < 30 seconds per base | |
| Connection graph build | < 10 seconds | |
| Writing Agent draft | < 5 seconds | |
| Verification Agent check | < 5 seconds | |
| Document ingestion (small text) | < 15 seconds | NEW |
| Document ingestion (medium PDF) | < 60 seconds | NEW |
| Semantic lint | < 30 seconds | NEW |

If any operation exceeds its target, document the bottleneck and whether it is acceptable for a prototype.

**Acceptance Criteria:**
- [ ] Performance measurements are recorded.
- [ ] No operation is unreasonably slow (e.g. > 2 minutes for a single base).
- [ ] Token usage per operation is logged and reviewed.

---

## Task 5.4: Update `README.md`

Update the root `README.md` to reflect the LLM Wiki architecture. The README must cover:

### Section 1: Introduction (Elevator Pitch)
- What the app is.
- Who it is for.
- What makes it unique: multi-agent, auditable, **LLM-maintained wiki backbone**.

### Section 2: End-User Friendly Functional Architecture
- Three functional groupings (Journalist UI, Knowledge Backbone, Agent Orchestration).
- Explain that the wiki is a **compounding artifact** maintained by the LLM.
- Explain ingestion, query, and lint as wiki lifecycle operations.

### Section 3: Step-by-Step Architecture Description
- Agent flows and orchestration (same as original).
- **NEW:** Explain LLM-driven ingestion: documents are uploaded, the LLM reads them, updates entity pages, and maintains the index.
- **NEW:** Explain writeback: investigation answers are filed into the wiki as synthesis pages.
- **NEW:** Explain semantic lint: the LLM health-checks the wiki for contradictions and stale claims.
- Rejection loop and verification gate.

### Section 4: Detailed Technical Architecture
- Tech stack: Vite, React, IndexedDB, `pdfjs-dist`, `marked`, OpenAI-compatible LLM API.
- **NEW:** Wiki storage model: markdown strings in IndexedDB (`index.md`, `log.md`, pages).
- **NEW:** Schema injection: every agent prompt includes the per-KB schema.
- **NEW:** Ingestion pipeline: extract → LLM analyze → batch write → update index/log.
- Agent instantiation and LLM session isolation.
- State management (React Context + reducer).
- Error handling and logging strategy.
- Security considerations.

### Section 5: Project Structure
- Complete tree view with descriptions.
- Highlight new/retrofitted files: `ingest.js`, `lint.js`, `schema-loader.js`, `WikiViewer.jsx`.

### Section 6: Setup and Usage
- `npm install && npm run dev`
- Configure LLM API in Settings.
- Upload documents to a wiki.
- Run investigation.
- File answers back to wiki.
- Run lint.

**Acceptance Criteria:**
- [ ] README has all six sections.
- [ ] Section 1 is readable by a journalist.
- [ ] Section 3 explains the new ingestion and writeback flows.
- [ ] Section 4 mentions markdown storage, schema injection, and semantic lint.
- [ ] Setup instructions work on a fresh clone.

---

## Task 5.5: Update `docs/demo-script.md`

Update the demo script to include the new LLM Wiki features:

1. **Configure LLM** (same as before)
2. **Load Demo Data** (same as before)
3. **Explore Wiki** (NEW)
   - Open WikiManager → View `kb-business-registry`
   - Browse entity pages, click `[[wikilink]]` links
   - Show index structure and log
4. **Upload Document** (NEW)
   - Create new wiki or select existing
   - Drop a document
   - Show progress: extracting → analyzing → writing
   - Open WikiViewer, show new pages
5. **Investigation** (same as before)
6. **File to Wiki** (NEW)
   - After verifying a block, click "File to Wiki"
   - Show the new synthesis page in WikiViewer
7. **Clarifying Question** (same as before, plus save answer)
8. **Lint** (NEW)
   - Run lint on a base
   - Show contradiction or stale claim detection
9. **Export** (same as before)

**Acceptance Criteria:**
- [ ] Demo script includes all new features.
- [ ] Demo script is tested end-to-end.
- [ ] Timing estimates are realistic.

---

## Task 5.6: Update `docs/LLM_WIKI_MASTER_INSTRUCTIONS.md`

Update the master instructions to reflect the new runtime architecture:

1. Clarify that the wiki is stored as markdown strings in IndexedDB (not files on disk).
2. Update the Ingest Workflow to describe the LLM-driven pipeline.
3. Update the Query Workflow to mention writeback (filing answers as synthesis pages).
4. Update the Lint Workflow to describe semantic lint.
5. Add a section on Schema Injection: how the schema is prepended to every agent prompt.
6. Add a section on Bidirectional Links: the backlink maintenance mechanism.
7. Add a section on Token Costs: estimates for ingestion and lint operations.

**Acceptance Criteria:**
- [ ] Master instructions accurately describe the current implementation.
- [ ] A new developer can read the instructions and understand how the wiki works.

---

## Task 5.7: Final Build and Commit

1. Run `npm run build` and verify zero errors.
2. Run `npm run preview` and verify the production build works.
3. Commit all changes with a clear commit message.
4. Tag the commit if desired (e.g. `v1.2-llm-wiki`).

**Acceptance Criteria:**
- [ ] `npm run build` succeeds.
- [ ] Production build loads and runs correctly.
- [ ] All changes are committed.

---

## Sprint 5 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] End-to-end flow test completed successfully.
- [ ] Backward compatibility verified.
- [ ] Performance measured and documented.
- [ ] README updated with new architecture.
- [ ] Demo script updated.
- [ ] Master instructions updated.
- [ ] Build is clean.
- [ ] **Final Step: Run `/compact`.**

**This is the final sprint of the LLM Wiki Fix Plan. After completion, the prototype fully aligns with Karpathy's LLM Wiki pattern.**
