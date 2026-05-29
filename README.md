# AI-Assisted Investigative Journalism Prototype

> **Version:** 1.2 (LLM Wiki Architecture Retrofit)  
> **Status:** Prototype — Client-Side Static App  
> **Companion Documents:** See `FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md` for full functional requirements and `IMPLEMENTATION_PLAN_AI_Investigative_Journalism_Prototype_v1.1.md` for sprint-based implementation details.

---

## 1. Introduction (Elevator Pitch)

Investigative journalists often work with disconnected datasets—business registries, sanctions lists, procurement records, customs logs—each stored in separate silos. Tracing a single person or company across these sources requires manual cross-referencing, specialized query syntax, and hours of tedious work.

This prototype is a **browser-based research acceleration tool** that automates cross-source tracing using a multi-agent AI architecture. A journalist enters a plain-language tip (e.g., *"Company X appears in procurement contracts and may be linked to sanctioned directors"*). The system then:

1. **Scores** the tip against multiple domain-specific knowledge bases.
2. **Spawns parallel research agents** to search each relevant base.
3. **Discovers cross-source connections** between entities.
4. **Drafts auditable note-blocks** with full citation trails.
5. **Verifies every claim** against original source documents before it ever reaches a draft.

What makes it unique is not just the AI assistance, but the **auditability**, **structured evidence chain**, and **LLM-maintained compounding wiki**: every paragraph in the final draft carries a complete trail back to the exact source passage, and the wiki grows through both document ingestion and investigation writeback. The system is backed by a **Karpathy-style LLM Wiki**—a persistent, compounding markdown knowledge layer stored in the browser—rather than a generic RAG retrieval system.

**Who is it for?** Investigative journalists and researchers who need to trace entities across structured databases without writing database queries.

**How it runs:** Everything happens in the browser. There is no backend server. Knowledge bases are stored in IndexedDB as markdown documents, LLM calls go directly from the browser to your chosen API, and all six agents run as client-side JavaScript modules.

**Prototype Limitations:** This is a personal prototype. There are no live API connections to external registries, no persistent user accounts, and no automated continuous ingest. All processing happens client-side. See FRD Section 6.3 for the full limitation list.

---

## 2. End-User Friendly Functional Architecture

The system is organized into three functional groups that work together like an investigative newsroom:

### Group 1: Journalist Perspective (The Newsroom Desk)
This is what the journalist sees in the browser. It includes:
- A **Tip Entry Portal** where you type a free-form lead.
- An **Active Knowledge Base Panel** showing which databases the system thinks are relevant—with the ability to override its choices.
- A **Connection Graph Navigator** displaying people, companies, and contracts as an interactive network.
- A **Verification Dashboard** where every AI-drafted paragraph is audited side-by-side with its source passages.
- A **Note-Block Composer** where verified paragraphs accumulate into an article draft.
- A **Clarifying Question Terminal** for follow-up questions at any stage.
- A **Wiki Manager** to create knowledge bases, upload documents, view schemas, and run health checks.
- A **Document Uploader** for drag-and-drop file ingest with LLM-driven analysis.
- A **Configuration Page** to set the LLM backend endpoint and API key.

### Group 2: Karpathy Knowledge Backbone (The Research Library)
This is the persistent knowledge layer stored in the browser's IndexedDB. Each domain (business registry, sanctions, procurement) has its own **knowledge base** containing:
- **Raw Source Vault:** Immutable original documents (PDFs, CSVs, text files) stored in IndexedDB.
- **Compiled Wiki Layer:** LLM-maintained markdown pages for every entity, concept, and source summary, cross-linked with `[[wikilinks]]`.
- **Schema:** Per-domain rules that tell agents how to ingest, query, cite, and verify.

The wiki is a **compounding artifact**: it grows when documents are ingested *and* when investigation answers are filed back as synthesis pages. Wiki lifecycle operations (ingest, query, writeback, lint) are performed through the **Wiki Manager** and **Document Uploader** panels—no command line required.

### Group 3: Agent Orchestration (The Investigation Team)
This is the engine room. When a tip is submitted, a team of six independent AI agents springs into action, each with its own private LLM session:

1. **Relevance Scoring Agent** reads every knowledge base catalog and decides which ones are relevant.
2. **Parallel Research Swarm** spawns one agent per activated base to search for matching passages and entities.
3. **Connection Agent** compares evidence from all bases and builds a relationship graph.
4. **Writing Agent** drafts a paragraph when you click a connection in the graph.
5. **Verification Agent** checks that paragraph against original source documents.
6. **Question Router** handles follow-up questions and dispatches new research queries.

Because each agent uses an **independent LLM session**, they do not share context windows or conversation state. This isolation is critical for auditability and prevents cross-contamination of evidence.

---

## 3. Step-by-Step Architecture Description of App Flow

This section explains how data moves through the system from tip to finished note-block, including the orchestration logic and the rejection loop that keeps bad evidence out of the composer.

### 3.1 Tip Submission & Relevance Scoring

1. The journalist submits a tip via the **Tip Entry** form.
2. The browser imports and runs the **Relevance Scoring Agent** (FR-301) with a fresh `LLMClient`.
3. The agent reads the wiki **index.md** (markdown string) from every knowledge base stored in IndexedDB.
4. It scores the tip against each base using the index content and schema guidance, returning a ranked array:
   ```json
   [{ "kbName": "kb-business-registry", "score": 0.85, "justification": "...", "activated": true }]
   ```
5. The UI displays this list in the **Active Knowledge Base Panel** (FR-102). The journalist can toggle bases on/off. Any change triggers a re-run of the full pipeline.

### 3.2 Parallel Research Swarm

1. The **Swarm Orchestrator** (FR-302) receives the tip and the list of activated bases.
2. It spawns one `ResearchAgent` per base, each with its own `LLMClient`, running concurrently via `Promise.all`.
3. Each agent:
   - Reads its assigned base's **index.md** from IndexedDB.
   - Identifies relevant entity/concept pages.
   - Reads those pages and extracts passages and entities matching the tip.
4. Each agent returns an **evidence bundle**:
   ```json
   {
     "kbName": "kb-business-registry",
     "passages": [{ "text": "...", "sourcePage": "entities/Jens Hansen.md", "entityRefs": ["Jens Hansen"] }],
     "entities": [{ "name": "Jens Hansen", "type": "person", "wikiPage": "entities/Jens Hansen.md" }]
   }
   ```
5. The swarm waits for all agents to complete before returning aggregated bundles. A slow agent does not block the others.

### 3.3 Connection Discovery

1. The **Connection Agent** (FR-303) instantiates its own `LLMClient`.
2. It consumes all evidence bundles and builds a graph:
   - **Nodes:** entities with type and provenance (which knowledge bases mention them).
   - **Edges:** relationships between entities that appear in the same source.
3. It flags potential aliases (e.g., "Jens Hansen" vs. "J. Hansen") for human review.
4. The graph JSON is rendered by the **Connection Graph Navigator** (FR-103).

### 3.4 Writing & The Rejection Loop

When the journalist clicks an edge or node in the graph:

1. The **Writing Agent** (FR-304) is instantiated with its own `LLMClient`.
   - **Critical constraint:** It receives the full swarm evidence bundles as a mandatory argument. If bundles are missing, it throws an error.
   - It is physically incapable of accessing any data outside those bundles.
   - Its system prompt includes the schemas of the relevant knowledge bases.
2. It locates passages relevant to the clicked connection and prompts the LLM to draft a single paragraph with inline citations.
3. The output appears in the **Verification Dashboard** (FR-105) with status **PENDING**.

### 3.5 Verification Gate

1. The journalist clicks **Verify**.
2. The **Verification Agent** (FR-305) instantiates its own `LLMClient`.
3. It reads the raw source files from IndexedDB (it is the only agent permitted to do this for audit purposes).
4. It checks three things:
   - Do the cited entities exist in the raw sources?
   - Is the relationship **explicitly stated**, or is it an LLM inference?
   - Were any passages taken out of context?
5. It returns:
   - `VERIFIED` → the journalist can click **Accept into Composer** or **File to Wiki**.
   - `FLAGGED` → a specific reason is shown (e.g., "inferred relationship," "passage out of context"). The journalist can **Reject** the block.

### 3.6 Writeback (Filing Answers to the Wiki)

After a block is verified, the journalist can **File to Wiki**:

1. The system creates a **synthesis page** in the selected knowledge base.
2. The synthesis page includes the original question, the analysis paragraph, evidence summaries, and citations.
3. The knowledge base's **index.md** is updated with the new synthesis entry.
4. The **log.md** records the filing action.
5. Entity pages referenced in the synthesis receive **bidirectional backlinks**.

This makes the wiki grow through queries as well as ingests.

### 3.7 LLM-Driven Document Ingestion

When a journalist uploads a document:

1. The **Document Uploader** validates that an LLM API is configured.
2. The raw text is extracted (PDF → `pdfjs-dist`, text → `file.text()`).
3. The ingest pipeline reads the schema, current **index.md**, and existing entity titles.
4. An LLM prompt asks the model to process the source and return structured updates:
   - Source summary page
   - Entity pages (new or updated)
   - Concept pages
   - Updated **index.md** with descriptive one-line summaries
   - Log entry
5. For large documents (>30,000 chars), the text is chunked and processed sequentially.
6. All updates are validated and written transactionally via `batchWriteWikiPages`.
7. **Bidirectional backlinks** are maintained for all `[[wikilink]]` references.

### 3.8 Semantic Lint

The journalist can run **Lint** from the Wiki Manager:

1. The **Lint Agent** reads the schema, index, sample pages, and recent log entries.
2. It sends a comprehensive health-check prompt to the LLM.
3. The LLM returns structured findings:
   - Contradictions between pages
   - Stale claims superseded by newer sources
   - Orphan pages
   - Missing concepts
   - Data gaps
   - Broken links
   - Suggested fixes
4. The report is displayed with color-coded severity (red/yellow/blue).
5. Results are appended to **log.md**.

### 3.9 Clarifying Questions

1. The journalist types a question in the terminal (FR-106).
2. The **Question Router** (FR-306) reads all active **index.md** files from IndexedDB, decides which bases to query, and dispatches a new mini-swarm.
3. New evidence bundles are integrated into the existing graph, updating nodes and edges without resetting the user's current view.
4. The journalist can **Save Answer to Wiki** to file the question and its evidence as a synthesis page.

### 3.10 Data Flow Summary

```
Tip → Relevance Scorer → Activated Bases → Parallel Swarm → Evidence Bundles
                                                             ↓
Clarifying Questions ← Question Router ← Graph Updates ← Connection Agent
                                                             ↓
Composer ← Verification Dashboard ← Verification Agent ← Writing Agent
                                                             ↓
                                                    Wiki Synthesis (Writeback)
                                                             ↑
Document Uploader → Ingest Pipeline → LLM Analysis → Batch Write → Index/Log Update
```

**Rejection criteria at each stage:**
- Relevance Scorer: bases below threshold (default 0.6) are excluded.
- Writing Agent: refuses to run without swarm bundles.
- Verification Agent: flags inferred relationships, missing entities, or out-of-context passages.
- Journalist: manual accept/reject/file in the Verification Dashboard.

---

## 4. Detailed Technical Architecture

### 4.1 Tech Stack & Dependencies

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Browser (ESM) | Modern Chrome/Firefox/Edge |
| PDF parsing | `pdfjs-dist` | 5.7.284 |
| YAML/Frontmatter | `js-yaml` | 4.1.0 |
| Frontend | React | 18.3.1 |
| Build tool | Vite | 5.2.12 |
| Graph visualization | Cytoscape.js | 3.26.0 |
| Storage | IndexedDB | Native API |
| Config | localStorage | Native API |

No backend, no database server, no Node.js runtime required in production. The built output is a collection of static HTML, CSS, and JS files.

### 4.2 Wiki Storage Model (Markdown in IndexedDB)

The wiki is stored as **markdown strings** in IndexedDB, not JSON objects:

- `wiki.{kbName}.index:index` → markdown string of `index.md`
- `wiki.{kbName}.log:entries` → markdown string of `log.md`
- `wiki.{kbName}.pages:{pageType}/{title}` → page object with `content` (markdown) and `frontmatter`

This gives the wiki file-like semantics while remaining inside the browser sandbox. The **index.md** is the single most critical document: the Relevance Scoring Agent and Question Router read *only* the index to select wikis. Every entry must have a descriptive one-line summary after the em-dash.

### 4.3 Schema Injection

Every agent that interacts with a knowledge base receives its schema as a prefix to its system prompt:

```js
const systemPrompt = await buildAgentSystemPrompt(
  kbName,
  'You search a wiki for evidence related to an investigative tip. Return only JSON.'
);
```

The schema governs page types, ingest rules, citation formats, verification thresholds, and query behavior. Changing a schema in WikiManager and re-running an investigation produces different agent behavior.

### 4.4 Ingestion Pipeline

```
User drops file
  → DocumentUploader validates LLM config
  → Extract text via rawVault
  → Read schema + index.md + existing entity titles
  → LLM processes source (chunked if >30K chars)
  → Parse JSON response
  → Validate operations
  → batchWriteWikiPages (transactional)
  → maintainBacklinks for all [[wikilink]] references
  → Update React store
```

Token cost is logged to the console for transparency.

### 4.5 Directory Structure & Module Responsibilities

```
/ai-investigative-journalism-prototype
├── public/
│   └── demo-data/                 # Bundled demo datasets for static loading
│       ├── kb-business-registry.json
│       ├── kb-sanctions.json
│       ├── kb-procurement.json
│       └── raw/                   # Demo PDFs referenced by demo loader
├── src/
│   ├── agents/                    # Group 3: Agent Orchestration
│   │   ├── relevance-scorer.js        # FR-301: Scores tips against KB indexes (markdown)
│   │   ├── swarm-orchestrator.js      # FR-302: Spawns parallel research agents
│   │   ├── connection-agent.js        # FR-303: Builds cross-source graph
│   │   ├── writing-agent.js           # FR-304: Drafts paragraphs; returns suggestedMarkdown
│   │   ├── verification-agent.js      # FR-305: Verifies citations against raw vault
│   │   ├── question-router.js         # FR-306: Routes clarifying questions
│   │   └── lint-agent.js              # NEW: LLM-driven semantic lint
│   ├── knowledge/                 # Group 2: Karpathy Knowledge Backbone
│   │   ├── wiki-page.js               # FR-202: WikiPage class, parseIndex, frontmatter
│   │   ├── schema-loader.js           # FR-203: Parses schema.md into config objects
│   │   └── query.js                   # FR-204: Agent query interface
│   ├── lib/                       # Browser infrastructure
│   │   ├── db.js                      # IndexedDB wrapper (namespace:key-value)
│   │   ├── wikiStore.js               # Wiki CRUD + batchWrite + backlink maintenance
│   │   ├── rawVault.js                # Raw source storage in IndexedDB
│   │   ├── pdfParser.js               # Browser PDF text extraction (pdfjs-dist)
│   │   ├── ingest.js                  # LLM-driven document ingest pipeline
│   │   ├── lint.js                    # Structural lint + semantic lint fallback
│   │   └── demoLoader.js              # Loads bundled JSON demo data into IndexedDB
│   ├── ui/                        # Group 1: Journalist Perspective
│   │   ├── main.jsx                   # React entry point
│   │   ├── App.jsx                    # Top-level routing (main / config)
│   │   ├── store.jsx                  # Global React Context + reducer state + ingestion
│   │   ├── styles.css                 # Global CSS
│   │   └── components/
│   │       ├── MainLayout.jsx             # 3-pane responsive layout
│   │       ├── TipEntry.jsx               # FR-101: Tip input
│   │       ├── ActiveKbPanel.jsx          # FR-102: KB activation panel
│   │       ├── ConnectionGraph.jsx        # FR-103: Cytoscape graph
│   │       ├── VerificationDashboard.jsx  # FR-105: Audit + File to Wiki
│   │       ├── NoteBlockComposer.jsx      # FR-104: Draft composer + per-block file
│   │       ├── ClarifyingQuestionTerminal.jsx # FR-106: Chat + Save Answer
│   │       ├── ConfigPage.jsx             # FR-107: LLM settings
│   │       ├── WikiManager.jsx            # KB CRUD, schema viewer, color-coded lint
│   │       ├── WikiViewer.jsx             # Renders markdown index + wikilink nav
│   │       └── DocumentUploader.jsx       # Drag-and-drop LLM-driven ingest
│   ├── shared/
│   │   ├── llm-client.js            # OpenAI-compatible client with console logging
│   │   └── schema-loader.js         # NEW: buildAgentSystemPrompt + validateSchema
│   └── App.jsx                      # Root component
├── data/                          # Source-of-truth demo datasets (build-time only)
│   ├── kb-business-registry/
│   ├── kb-sanctions/
│   ├── kb-procurement/
│   └── kb-demo/
├── scripts/
│   └── bundle-demo-data.js        # Build-time: packages data/ into public/demo-data/
├── docs/
│   ├── LLM_WIKI_MASTER_INSTRUCTIONS.md
│   └── demo-script.md
├── .github/workflows/
│   └── deploy.yml                 # GitHub Actions: build + deploy to Pages
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

### 4.6 Agent Instantiation & LLM Session Isolation

Every agent module exports a function that creates a **new** `LLMClient` instance locally:

```js
const client = new LLMClient(config);
console.log(`[AgentName] instanceId=${client.instanceId}`);
```

- The `instanceId` is a UUID generated at construction time via `crypto.randomUUID()`.
- `conversationHistory` is stored as an instance property, not a global or shared variable.
- No two agents ever reference the same `LLMClient` object.
- Debug logs are written to the browser console with the `instanceId`, making isolation auditable.

### 4.7 State Management Architecture

The frontend uses a single React Context with a `useReducer` pattern:

```js
const [state, dispatch] = useReducer(reducer, initialState);
```

State tree:
- `config` — LLM endpoint settings (loaded from `localStorage`).
- `tip` — Current investigative tip.
- `loading` — Global loading flag during agent runs.
- `activatedBases` — Array of KB scores from Relevance Scorer.
- `graph` — Connection Agent output (nodes, edges, aliases, bundles).
- `noteBlocks` — Accepted verified paragraphs.
- `pendingBlock` — Paragraph currently in Verification Dashboard.
- `conversation` — Clarifying question history.
- `selectedConnection` — Last clicked graph edge/node ID.
- `ingestion` — Document upload progress (status, fileName, error, kbName).

All components read from and dispatch to this single store. Updates propagate via React's re-rendering mechanism without page reloads.

### 4.8 Error Handling & Logging Strategy

- **LLM errors:** Descriptive errors bubble up to the UI as `alert()` messages. Agents also have heuristic fallbacks (keyword matching) so the prototype remains demonstrable even without a live LLM.
- **PDF errors:** If `pdfjs-dist` fails to parse a PDF, the error is caught and surfaced in the Document Uploader status text.
- **Debug logging:** Every LLM request and response is logged to the browser console with `instanceId`, timestamp, and payload.
- **Agent errors:** Caught at the UI component level and surfaced to the user.
- **Ingest errors:** Invalid LLM responses or network failures do not corrupt the wiki; validation occurs before any writes.

### 4.9 Security Considerations

- **API keys in browser:** The LLM API key is stored in `localStorage` and sent directly from the browser to the LLM provider. This is acceptable for a personal prototype but would require a proxy server in production.
- **CORS:** Most OpenAI-compatible endpoints (OpenAI, OpenRouter, local proxies) support browser `fetch`. Some providers may require a CORS proxy.
- **No backend:** There is no server to attack, no database to inject into, and no shared state between users.
- **HTTPS validation:** The Configuration Page validates that the API base URL uses HTTPS.
- **Immutable raw vault:** Raw sources are stored as read-only records in IndexedDB. The ingest process creates wiki pages but never modifies the original stored file.

---

## 5. Project Structure

```
.
├── public/
│   └── demo-data/                 # Bundled demo datasets (loaded at runtime)
│       ├── kb-business-registry.json
│       ├── kb-sanctions.json
│       ├── kb-procurement.json
│       └── raw/                   # Demo PDFs
├── data/                          # Source demo datasets (build-time only)
│   ├── kb-registry/
│   │   └── index.md                 # Wiki-of-wikis catalog
│   ├── kb-demo/
│   │   ├── raw/
│   │   ├── wiki/
│   │   └── schema.md
│   ├── kb-business-registry/        # Demo: company registrations
│   ├── kb-sanctions/                # Demo: sanctions list
│   └── kb-procurement/              # Demo: public contracts
├── docs/
│   ├── LLM_WIKI_MASTER_INSTRUCTIONS.md  # Wiki governance (10 rules)
│   └── demo-script.md                   # Step-by-step demo script
├── scripts/
│   └── bundle-demo-data.js          # Build-time script to package data/
├── src/
│   ├── agents/
│   │   ├── relevance-scorer.js      # FR-301
│   │   ├── swarm-orchestrator.js    # FR-302
│   │   ├── connection-agent.js      # FR-303
│   │   ├── writing-agent.js         # FR-304
│   │   ├── verification-agent.js    # FR-305
│   │   ├── question-router.js       # FR-306
│   │   └── lint-agent.js            # NEW: Semantic lint
│   ├── knowledge/
│   │   ├── wiki-page.js             # FR-202
│   │   ├── schema-loader.js         # FR-203
│   │   └── query.js                 # FR-204
│   ├── lib/
│   │   ├── db.js                    # IndexedDB wrapper
│   │   ├── wikiStore.js             # Wiki CRUD + batchWrite + backlinks
│   │   ├── rawVault.js              # Raw source storage
│   │   ├── pdfParser.js             # Browser PDF parsing
│   │   ├── ingest.js                # LLM-driven document ingest
│   │   ├── lint.js                  # Structural + semantic lint
│   │   └── demoLoader.js            # Loads demo data into IndexedDB
│   ├── ui/
│   │   ├── main.jsx                 # React entry
│   │   ├── App.jsx                  # Root component & routing
│   │   ├── store.jsx                # Global React Context state
│   │   ├── styles.css               # Global styles
│   │   └── components/
│   │       ├── MainLayout.jsx           # 3-pane layout
│   │       ├── TipEntry.jsx             # FR-101
│   │       ├── ActiveKbPanel.jsx        # FR-102
│   │       ├── ConnectionGraph.jsx      # FR-103
│   │       ├── NoteBlockComposer.jsx    # FR-104
│   │       ├── VerificationDashboard.jsx # FR-105
│   │       ├── ClarifyingQuestionTerminal.jsx # FR-106
│   │       ├── ConfigPage.jsx           # FR-107
│   │       ├── WikiManager.jsx          # KB CRUD + schema + lint
│   │       ├── WikiViewer.jsx           # Markdown rendering + wikilinks
│   │       └── DocumentUploader.jsx     # LLM-driven ingest UI
│   ├── shared/
│   │   ├── llm-client.js            # OpenAI-compatible LLM client
│   │   └── schema-loader.js         # buildAgentSystemPrompt + validateSchema
│   └── App.jsx                      # Root component
├── .github/workflows/
│   └── deploy.yml                   # Build & deploy to GitHub Pages
├── package.json                     # Dependencies & scripts
├── vite.config.js                   # Vite build config (base: './')
├── index.html                       # HTML entry point
└── README.md                        # This file
```

---

## Setup Instructions

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open browser
# http://localhost:5173
```

### Configure LLM API

1. Click **Settings** in the top bar.
2. Enter a valid HTTPS LLM API Base URL (e.g., `https://api.openai.com`) and Model Name (e.g., `gpt-4o`).
3. Click **Save & Reset Sessions**.

### Upload Documents

1. Open **Wiki Manager** and create or select a knowledge base.
2. Use the **Document Uploader** to drag and drop a PDF, TXT, MD, CSV, or JSON file.
3. The file is extracted, analyzed by the LLM, and the wiki is updated with source summaries, entity pages, and index entries.

### Run Investigation

1. Enter a tip in the **Tip Entry** panel.
2. Click **Start Investigation**.
3. Browse the **Connection Graph**, click edges, and draft paragraphs.
4. Verify paragraphs and accept them into the composer.

### File Answers to Wiki

1. After verifying a paragraph, click **File to Wiki**.
2. Select the target knowledge base and confirm.
3. The synthesis page appears in **WikiViewer** under the Synthesis section.

### Run Lint

1. Open **Wiki Manager** and select a knowledge base.
2. Click **Lint**.
3. Review the color-coded report for contradictions, stale claims, and suggestions.

### Deploy to GitHub Pages

```bash
# The GitHub Actions workflow handles this automatically on push to main.
# Ensure your repo settings have Pages → Source = GitHub Actions.
```

### Optional: Re-bundle demo data

If you modify files in `data/`, rebuild the demo bundles:

```bash
node scripts/bundle-demo-data.js
```

This updates `public/demo-data/` so the "Load Demo Data" button serves the latest content.

---

**References:**
- Functional Requirements: `FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md`
- Implementation Plan: `IMPLEMENTATION_PLAN_AI_Investigative_Journalism_Prototype_v1.1.md`
- LLM Wiki Fix Plan: `plan/llm-wiki-fix-plan/implementation-plan.md`
