# Implementation Plan
# AI-Assisted Investigative Journalism Prototype

**Version:** 1.1  
**Date:** 2026-05-27  
**Status:** APPROVED  
**Companion Document:** FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md

---

## How to Use This Plan

This plan is written for a coding agent. Each sprint contains implementation tasks phrased as direct instructions. Every task references specific Functional Requirements from the companion FRD. You should implement sprints in order. Do not proceed to the next sprint until the current sprint's acceptance criteria are met.

---

## Sprint 0: Prerequisites & Foundation

**Goal:** Establish the project scaffold, LLM client abstraction, and the LLM Wiki system instructions that will govern how all knowledge bases are created and maintained.

### Task 0.1: Project Scaffold

You should create the root project directory with the following structure:

```
/ai-investigative-journalism-prototype
  /src
    /agents          -- Group 3: Agent Orchestration
    /knowledge       -- Group 2: Karpathy Knowledge Backbone
    /ui              -- Group 1: Journalist Perspective (browser frontend)
    /shared          -- Utilities, types, LLM client
  /data
    /kb-registry     -- Wiki-of-wikis index and global schema
    /kb-{name}       -- One per knowledge base (raw + wiki)
  /docs
    /frd             -- The approved FRD document
    /schemas         -- Per-knowledge-base schema files
  package.json / requirements.txt / etc.
```

You should set up a build system that supports:
- A backend runtime capable of spawning concurrent LLM sessions (Node.js with fetch, Python with httpx, or equivalent).
- A frontend build pipeline that outputs a static or served browser application.
- A development server that can serve the frontend and expose API endpoints for the agents.

**Acceptance Criteria:**
- [ ] `npm run dev` or equivalent starts both frontend and backend.
- [ ] The directory structure exists and is committed to version control.
- [ ] A `.gitignore` excludes `node_modules`, environment files, and any downloaded model weights.

### Task 0.2: LLM Client Abstraction

You should build a reusable LLM client module in `/src/shared/llm-client.js` (or equivalent) that:
- Accepts a base URL, model name, and API key from the Configuration Page (FR-107).
- Exposes a single method: `sendMessage(systemPrompt, userMessage, temperature = 0.2)`.
- Returns the raw text response from the LLM.
- Supports OpenAI-compatible chat completions format (`/v1/chat/completions`).
- Logs every request and response to a local debug log for traceability.

You should ensure that every agent in Group 3 instantiates its own `LLMClient` instance. No two agents shall share a client instance, context window, or conversation state. This enforces the Independent LLM Session requirement (FR-301 through FR-306).

**Acceptance Criteria:**
- [ ] The client can successfully call a configured endpoint and return text.
- [ ] Two simultaneous client instances do not share state.
- [ ] Failed requests throw descriptive errors that bubble up to the UI.

### Task 0.3: LLM Wiki System Instructions

You should create a master system instructions document at `/docs/LLM_WIKI_MASTER_INSTRUCTIONS.md`. This document adapts Karpathy's LLM Wiki gist for this prototype. It must govern how the coding agent (you) creates and maintains all knowledge base wikis.

The instructions must include:

1. **The Three Layers:** Raw sources (immutable), the Wiki (LLM-maintained markdown), and the Schema (per-knowledge-base conventions).
2. **The Wiki-of-Wikis Concept:** Because this prototype requires multiple independent knowledge bases (one per domain: business registry, sanctions, procurement, customs), you should maintain a global `kb-registry/index.md` that acts as a catalog of all knowledge bases. Each entry links to the base's own `index.md` and includes a one-line domain summary.
3. **When to Create a New Wiki:** A new wiki directory (`/data/kb-{name}/wiki/`) is created when a new domain-specific dataset is introduced. The coding agent runs an Ingest pass (FR-204) to populate it.
4. **When to Update an Existing Wiki:** A wiki is updated when new raw sources are added, when contradictions are discovered during Lint (FR-204), or when the schema evolves. Updates are performed by the coding agent, not at runtime by the UI.
5. **Page Types:** Entity pages, Concept pages, Source summaries, Synthesis pages, and the special `index.md` and `log.md` files.
6. **Cross-Reference Convention:** All inter-page links use `[[wikilink]]` syntax. Every entity page must have a Connections section with bidirectional links.
7. **Frontmatter Standard:** Every wiki page must include YAML frontmatter with at minimum: `type`, `date_created`, `source_count`, and `status`.
8. **Ingest Workflow:** Read raw source → discuss key takeaways → write source summary → update index → update all relevant entity and concept pages → append to log.
9. **Query Workflow:** Read `index.md` → identify relevant pages → read them → synthesize answer with `[[wikilink]]` citations.
10. **Lint Workflow:** Scan for contradictions, stale claims, orphan pages, missing concept pages, and data gaps. Suggest new sources or questions.

You should treat this document as the schema equivalent of Karpathy's `CLAUDE.md`, but scoped to this investigative journalism prototype and extended to handle multiple wikis.

**Acceptance Criteria:**
- [ ] `/docs/LLM_WIKI_MASTER_INSTRUCTIONS.md` exists and covers all 10 points above.
- [ ] `/data/kb-registry/index.md` exists as the wiki-of-wikis catalog, even if empty initially.
- [ ] A sample knowledge base (`/data/kb-demo/`) exists with the full directory structure (raw, wiki, schema.md) to prove the pattern works.

### Task 0.4: Global Configuration Store

You should implement an in-memory configuration store (backend) and a settings form (frontend) that satisfies FR-107.

Backend:
- An API endpoint `POST /api/config` that accepts `{ apiBaseUrl, modelName }`.
- Validation that `apiBaseUrl` is a valid HTTPS URL.
- The config is held in memory for the session. No persistent database.

Frontend:
- A settings page accessible from the top navigation.
- Two input fields: "LLM API Base URL" and "Model Name".
- A "Save & Reset Sessions" button that warns the user if agents are already running.

**Acceptance Criteria:**
- [ ] Config values are readable by all agent constructors.
- [ ] Changing config while agents are running shows a warning and requires confirmation.
- [ ] Invalid URLs are rejected with a clear error message.

---

## Sprint 1: Knowledge Backbone (Group 2)

**Goal:** Build the Karpathy Knowledge Backbone layer. All wiki creation and maintenance happens here, performed by the coding agent, not the UI.

### Task 1.1: Raw Source Vault with PDF Support

You should implement the Raw Source Vault (FR-201) for all knowledge bases.

- Each knowledge base has a `/data/kb-{name}/raw/` directory.
- You should support markdown, plain text, CSV, JSON, and PDF files.
- For PDFs, you should integrate a text extraction library (e.g., `pdf-parse` for Node.js, `PyPDF2` or `pdfplumber` for Python). Extracted text is stored alongside the original PDF or used directly during Ingest.
- Raw files are immutable. No runtime code modifies them.

**Acceptance Criteria:**
- [ ] A PDF dropped into `/data/kb-demo/raw/` is parsed and its text is extractable.
- [ ] Attempting to write to the raw directory at runtime throws an error.

### Task 1.2: Compiled Wiki Layer Structure

You should implement the directory structure and file templates for the Compiled Wiki Layer (FR-202).

For every knowledge base, the wiki directory must contain:
- `index.md` — content catalog
- `log.md` — chronological record
- `/entities/` — entity pages
- `/concepts/` — concept pages
- `/synthesis/` — generated analysis pages

You should create a `WikiPage` class or module that enforces:
- YAML frontmatter on every page.
- `[[wikilink]]` syntax for cross-references.
- Append-only behavior for `log.md`.

**Acceptance Criteria:**
- [ ] The directory structure matches the FRD Section 4.1 exactly.
- [ ] Creating a new entity page auto-generates correct frontmatter.
- [ ] `index.md` can be parsed to return a list of all pages with summaries.

### Task 1.3: Per-Knowledge-Base Schema Configuration

You should implement the Schema Configuration (FR-203) as a markdown file per knowledge base: `/data/kb-{name}/schema.md`.

Each schema must define:
- Page types and their directory locations.
- Ingest workflow rules per document format (text vs. PDF vs. structured data).
- Query behavior: how agents read index.md before drilling deeper.
- Citation format: how agents cite passages (e.g., `[[Entity Name]](source:raw/filename.pdf#page=3)`).
- Verification thresholds: what counts as an explicit statement vs. an inference.

You should create a `SchemaLoader` utility that reads `schema.md` and returns a validated configuration object used by agents.

**Acceptance Criteria:**
- [ ] Every knowledge base has a `schema.md`.
- [ ] The schema loader validates required fields and throws on missing rules.
- [ ] Agents can access schema rules at runtime.

### Task 1.4: Wiki Lifecycle Operations (Ingest / Query / Lint)

You should implement the three core operations (FR-204) as coding-agent-facing scripts or modules, not UI features.

**Ingest:**
- A script `npm run ingest --kb=kb-demo --source=raw/newfile.pdf`.
- The script reads the raw source, extracts key information, and updates the wiki.
- It updates `index.md`, relevant entity/concept pages, cross-references, and appends to `log.md`.
- One source may touch 10–15 wiki pages.

**Query:**
- A module used by agents: given a question, read `index.md`, identify relevant pages, read them, synthesize answer with citations.
- This is the primary interface between Group 3 agents and Group 2.

**Lint:**
- A script `npm run lint --kb=kb-demo`.
- Scans for contradictions, stale claims, orphan pages, missing concepts, and data gaps.
- Outputs a report suggesting fixes or new sources.

**Acceptance Criteria:**
- [ ] Ingest processes a new raw file and produces updated wiki pages.
- [ ] Query returns a synthesized answer with `[[wikilink]]` citations.
- [ ] Lint produces a human-readable report of issues found.
- [ ] All three operations log to `log.md`.

### Task 1.5: Demo Datasets

You should prepare at least two demo knowledge bases with pre-loaded wiki layers for the prototype demonstration.

Suggested:
- `kb-business-registry` — simulated company and director data.
- `kb-sanctions` — simulated sanctions list entries.
- `kb-procurement` — simulated public contracts.

Each should have:
- A populated `/raw/` directory with source files (including at least one PDF per base).
- A fully compiled `/wiki/` directory with entity pages, concept pages, index.md, and log.md.
- A `schema.md` tailored to that domain.

You should run Ingest and Lint on these datasets to ensure the wikis are consistent before moving to Sprint 2.

**Acceptance Criteria:**
- [ ] At least two knowledge bases exist with compiled wikis.
- [ ] Each base contains at least one PDF in `/raw/` with extracted text in the wiki.
- [ ] `kb-registry/index.md` catalogs all bases with summaries.

---

## Sprint 2: Agent Orchestration (Group 3)

**Goal:** Build all six agents. Each agent must be an independent LLM session using the global config (FR-107). All agents query the Compiled Wiki Layer, not raw documents directly.

### Task 2.1: Relevance Scoring Agent (FR-301)

You should implement the Relevance Scoring Agent as a standalone module in `/src/agents/relevance-scorer.js`.

- It instantiates its own `LLMClient` with the global config.
- It reads `index.md` from every knowledge base listed in `kb-registry/index.md`.
- It scores the journalist's tip against each base using an LLM prompt that considers entity names, concept coverage, and domain overlap.
- It returns a ranked array: `[{ kbName, score, justification, activated: score > threshold }]`.
- The threshold is read from the global config or defaults to 0.6.

**Acceptance Criteria:**
- [ ] Given a tip, it returns a ranked list of knowledge bases with justifications.
- [ ] It only instantiates one LLM session for its own work.
- [ ] It does not share state with any other agent.

### Task 2.2: Parallel Research Agent Swarm (FR-302)

You should implement the Parallel Research Swarm as a swarm orchestrator plus individual research agents.

- The orchestrator accepts a tip and a list of activated knowledge bases from the Relevance Scoring Agent.
- It spawns one `ResearchAgent` per activated base using `Promise.all` or worker threads.
- Each `ResearchAgent` instantiates its own `LLMClient`.
- Each agent reads its assigned base's `index.md`, identifies relevant pages, reads them, and extracts passages and entities matching the tip.
- Each agent returns a structured evidence bundle: `{ kbName, passages: [{ text, sourcePage, entityRefs }], entities: [{ name, type, wikiPage }] }`.
- The swarm waits for all agents to complete before returning the aggregated bundles.

**Acceptance Criteria:**
- [ ] Multiple agents run concurrently without blocking each other.
- [ ] Each agent uses its own LLM session.
- [ ] The output is an array of evidence bundles, one per knowledge base.
- [ ] A slow agent does not prevent others from completing.

### Task 2.3: Connection Agent (FR-303)

You should implement the Connection Agent in `/src/agents/connection-agent.js`.

- It instantiates its own `LLMClient`.
- It consumes the aggregated evidence bundles from the Parallel Research Swarm.
- It identifies entities that appear across multiple knowledge bases (by name matching and alias resolution).
- It builds a relationship graph in JSON format:
  ```json
  {
    "nodes": [{ "id", "label", "type", "sources": ["kb-name"] }],
    "edges": [{ "source", "target", "label", "provenance": ["kb-name"] }]
  }
  ```
- It flags entities referenced by different names across sources (e.g., "Jens Hansen" vs. "J. Hansen").

**Acceptance Criteria:**
- [ ] It produces a valid graph with nodes and edges.
- [ ] Cross-source connections have provenance arrays.
- [ ] It flags potential alias matches for human review.

### Task 2.4: Writing Agent (FR-304)

You should implement the Writing Agent in `/src/agents/writing-agent.js`.

**Critical Constraints:**
- The agent shall only consume data originating from the Parallel Research Swarm (FR-302). It shall not access external sources, static templates, or pre-loaded content outside the swarm evidence bundles.
- The agent shall not execute or produce output until the Parallel Research Swarm has completed and delivered its evidence bundles.

Implementation:
- It instantiates its own `LLMClient`.
- It accepts a `connectionId` (representing a clicked graph edge or node) and the full swarm evidence bundles.
- It locates the relevant passages within the bundles for that connection.
- It prompts the LLM to write a single paragraph explaining the connection, citing exact sources and passages.
- It returns `{ paragraph, citations: [{ source, passage, wikiPage }] }`.

**Acceptance Criteria:**
- [ ] It refuses to run if swarm bundles are not provided.
- [ ] Its output cites only passages found in the swarm data.
- [ ] It uses its own independent LLM session.

### Task 2.5: Verification Agent (FR-305)

You should implement the Verification Agent in `/src/agents/verification-agent.js`.

- It instantiates its own `LLMClient`.
- It accepts a note-block (paragraph + citations) and the raw source vault paths.
- It confirms:
  1. Cited entities exist in the raw sources.
  2. The relationship is explicitly stated in source text, not inferred.
  3. No passages were taken out of context.
- It returns `{ status: "VERIFIED" | "FLAGGED", reason: "..." | null }`.
- For verification, it may read the raw source files directly (this is the only agent permitted to do so for audit purposes).

**Acceptance Criteria:**
- [ ] It correctly flags inferred relationships.
- [ ] It correctly flags out-of-context passages.
- [ ] It correctly verifies explicitly stated facts.
- [ ] It uses its own independent LLM session.

### Task 2.6: Question Router (FR-306)

You should implement the Question Router in `/src/agents/question-router.js`.

- It instantiates its own `LLMClient`.
- It accepts a clarifying question from the journalist and the current session context (previous questions, active knowledge bases).
- It reads the `index.md` of all active knowledge bases to identify which bases might answer the question.
- It formulates a targeted query per relevant base.
- It dispatches to new `ResearchAgent` instances (reusing the swarm pattern from FR-302).
- It integrates returning evidence into the existing graph and note-blocks.

**Acceptance Criteria:**
- [ ] It routes questions to the correct knowledge bases.
- [ ] It maintains session context across multiple questions.
- [ ] It triggers graph updates when new evidence arrives.
- [ ] It uses its own independent LLM session.

---

## Sprint 3: Journalist Perspective UI (Group 1)

**Goal:** Build the browser-facing interface. The UI only reads from the compiled wiki layer. It does not create or modify wikis.

### Task 3.1: Configuration Page (FR-107)

You should implement the settings page as described in Sprint 0, Task 0.4. If not already complete, finish it now.

- Top navigation settings icon.
- Fields: LLM API Base URL (HTTPS), Model Name.
- Save triggers a backend update. Reset warning if agents are running.

**Acceptance Criteria:**
- [ ] Matches all acceptance criteria from Task 0.4.

### Task 3.2: Tip Entry Portal (FR-101)

You should implement a prominent input field in the left pane.

- Large textarea with placeholder text.
- Submit button labeled "Start Investigation".
- On submit, the tip text is sent to the backend endpoint `POST /api/investigate`.
- The backend triggers the Relevance Scoring Agent (FR-301) and returns the activated base list.
- The tip text remains visible at the top of the left pane for the entire session.

**Acceptance Criteria:**
- [ ] Submit triggers the relevance scorer.
- [ ] The tip is preserved and visible throughout the session.
- [ ] The UI shows a loading state while the scorer runs.

### Task 3.3: Active Knowledge Base Panel (FR-102)

You should implement a panel below the Tip Entry Portal.

- Lists each activated base with its relevance justification.
- Each base has a checkbox. Unchecking removes it from the swarm; checking adds it.
- Changes trigger a re-run of the Parallel Research Swarm (FR-302).
- A "Re-run Investigation" button appears if the user modifies the panel.

**Acceptance Criteria:**
- [ ] Bases are listed with justifications.
- [ ] Manual override triggers swarm re-execution.
- [ ] The panel updates when the Question Router adds new evidence.

### Task 3.4: Connection Graph Navigator (FR-103)

You should implement an interactive graph in the center pane.

- Use a graph visualization library (e.g., D3.js, Cytoscape.js, or vis-network).
- Render nodes and edges from the Connection Agent output (FR-303).
- Nodes are color-coded by type (person, company, contract, event).
- Edges show provenance labels on hover.
- Clicking an edge or node triggers the Writing Agent (FR-304) and shows a loading indicator.
- The graph updates dynamically when the Question Router returns new evidence.

**Acceptance Criteria:**
- [ ] The graph renders correctly from Connection Agent JSON.
- [ ] Clicking an edge triggers the Writing Agent.
- [ ] Dynamic updates do not reset the user's current view.

### Task 3.5: Note-Block Composer (FR-104)

You should implement the composer in the right pane.

**Critical Constraints:**
- The composer shall only consume data originating from the Parallel Research Swarm (FR-302). It shall not access any external data sources, pre-loaded templates, or static content.
- The composer shall remain inactive and display a waiting state until the Parallel Research Swarm has completed execution and returned evidence bundles.

Implementation:
- A textarea or editable div that accumulates verified note-blocks.
- Each block is a discrete paragraph with a citation trail displayed in a collapsible footer.
- Blocks can be reordered via drag-and-drop or up/down buttons.
- Blocks can be deleted.
- An "Export as Markdown" button downloads the accumulated draft.
- While the swarm is running, the composer shows: "Waiting for research to complete..."

**Acceptance Criteria:**
- [ ] Composer is locked until swarm completes.
- [ ] Only verified blocks from swarm data can be added.
- [ ] Export produces valid markdown with citations.

### Task 3.6: Verification Dashboard (FR-105)

You should implement a panel above the Note-Block Composer.

- Side-by-side view: drafted note-block on the left, source passages on the right.
- Status badge: Verified (green), Pending (yellow), Flagged (red).
- For Flagged blocks, the specific reason is displayed.
- "Accept into Composer" button for Verified blocks.
- "Reject" button for Flagged blocks.

**Acceptance Criteria:**
- [ ] Side-by-side view renders correctly.
- [ ] Status badges are accurate per Verification Agent output.
- [ ] Accept/Reject buttons update the composer state.

### Task 3.7: Clarifying Question Terminal (FR-106)

You should implement a chat interface at the bottom of the left pane.

- Text input with send button.
- Messages are sent to `POST /api/clarify`.
- The backend routes through the Question Router (FR-306).
- Responses update the Connection Graph Navigator and Active KB Panel.
- Conversation history is maintained for the session.

**Acceptance Criteria:**
- [ ] Questions are sent and responses received.
- [ ] Graph updates when new evidence arrives.
- [ ] History persists for the session.

---

## Sprint 4: Integration & End-to-End

**Goal:** Wire all components together, test the full flow, and prepare the demo.

### Task 4.1: Backend API Endpoints

You should implement the following REST API endpoints:

- `POST /api/config` — Save LLM config (FR-107).
- `GET /api/config` — Read current LLM config.
- `POST /api/investigate` — Accept tip, run Relevance Scorer + Swarm + Connection Agent. Returns graph.
- `POST /api/write` — Accept connectionId, run Writing Agent. Returns draft paragraph.
- `POST /api/verify` — Accept draft paragraph, run Verification Agent. Returns status.
- `POST /api/clarify` — Accept question, run Question Router. Returns updated graph.

You should ensure each endpoint properly instantiates agents with independent LLM sessions and passes the global config.

**Acceptance Criteria:**
- [ ] All endpoints exist and return correct JSON.
- [ ] Each endpoint invocation creates fresh agent instances.
- [ ] Errors return 500 with descriptive messages.

### Task 4.2: Frontend State Management

You should implement a global state store (e.g., Zustand, Redux, or plain React Context) that holds:
- Current LLM config.
- Active tip text.
- Activated knowledge bases.
- Current graph data.
- Accumulated note-blocks.
- Conversation history.

The store should update reactively when backend responses arrive.

**Acceptance Criteria:**
- [ ] All UI components read from and write to the global store.
- [ ] Updates propagate without full page reloads.

### Task 4.3: End-to-End Flow Test

You should manually or automatically test the complete Use Case from FRD Section 7:

1. Configure LLM endpoint.
2. Enter tip about Company X and procurement/sanctions.
3. Verify Relevance Scorer activates correct bases.
4. Verify Swarm returns evidence.
5. Verify Connection Graph renders.
6. Click an edge, verify Writing Agent drafts a paragraph using only swarm data.
7. Verify Verification Agent checks it.
8. Accept into Composer.
9. Ask a clarifying question, verify graph updates.

**Acceptance Criteria:**
- [ ] The full flow completes without errors.
- [ ] Each agent uses its own LLM session (verify via debug logs).
- [ ] The composer only contains swarm-derived, verified content.

### Task 4.4: Demo Preparation

You should prepare the prototype for demonstration on June 19.

- Record a short demo script matching the Use Case.
- Ensure the demo datasets are loaded and wikis are linted.
- Verify the UI is responsive and all agents respond within acceptable time (FRD Section 6.1).
- Create a `README.md` at project root with setup instructions.

**Acceptance Criteria:**
- [ ] Demo script exists in `/docs/demo-script.md`.
- [ ] Setup instructions allow a fresh clone to run with `npm install && npm run dev`.
- [ ] All acceptance criteria from Sprints 0–3 are met.

---

## Cross-Cutting Concerns

### LLM Session Isolation
You should verify throughout all sprints that no two agents share an LLM session. The simplest check: log the `LLMClient` instance ID or a UUID at agent initialization. If two agents log the same ID, the isolation requirement is violated.

### Swarm-Only Data Constraint
You should enforce at the code level that the Writing Agent and Note-Block Composer cannot access data outside the swarm evidence bundles. The Writing Agent constructor should require `swarmBundles` as a mandatory argument and throw if absent. The Composer should receive blocks only through the Verification Dashboard, which only consumes Writing Agent output.

### Wiki Maintenance by Coding Agent
You should never implement UI features that create, edit, or lint wiki pages. All wiki lifecycle operations (FR-204) are coding-agent scripts. The UI is read-only against the compiled wiki layer.

### PDF Support
You should ensure the Raw Source Vault (FR-201) and Ingest script handle PDFs. If a PDF fails to parse, the error is logged and the file is skipped, but the vault remains immutable.

---

**End of Implementation Plan**
