# Sprint 0: Prerequisites & Foundation

**Goal:** Establish the project scaffold, LLM client abstraction, and the LLM Wiki system instructions that will govern how all knowledge bases are created and maintained.

**DO NOT proceed to Sprint 1 until ALL acceptance criteria below are met.**

---

## Task 0.1: Project Scaffold

Create the root project directory with the following structure:

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

Set up a build system that supports:
- A backend runtime capable of spawning concurrent LLM sessions (Node.js with fetch, Python with httpx, or equivalent).
- A frontend build pipeline that outputs a static or served browser application.
- A development server that can serve the frontend and expose API endpoints for the agents.

**FRD Reference:** Section 4.1 (Knowledge Base Structure), Section 5.1 (Browser-Based)

**Acceptance Criteria:**
- [ ] `npm run dev` or equivalent starts both frontend and backend.
- [ ] The directory structure exists and is committed to version control.
- [ ] A `.gitignore` excludes `node_modules`, environment files, and any downloaded model weights.

---

## Task 0.2: LLM Client Abstraction

Build a reusable LLM client module in `/src/shared/llm-client.js` (or equivalent) that:
- Accepts a base URL, model name, and API key from the Configuration Page (FR-107).
- Exposes a single method: `sendMessage(systemPrompt, userMessage, temperature = 0.2)`.
- Returns the raw text response from the LLM.
- Supports OpenAI-compatible chat completions format (`/v1/chat/completions`).
- Logs every request and response to a local debug log for traceability.

Ensure that every agent in Group 3 instantiates its own `LLMClient` instance. No two agents shall share a client instance, context window, or conversation state. This enforces the Independent LLM Session requirement (FR-301 through FR-306).

**FRD Reference:** FR-107 (Configuration Page), FR-301 through FR-306 (Agent Orchestration)

**Acceptance Criteria:**
- [ ] The client can successfully call a configured endpoint and return text.
- [ ] Two simultaneous client instances do not share state.
- [ ] Failed requests throw descriptive errors that bubble up to the UI.

---

## Task 0.3: LLM Wiki System Instructions

Create a master system instructions document at `/docs/LLM_WIKI_MASTER_INSTRUCTIONS.md`. This document adapts Karpathy's LLM Wiki gist for this prototype. It must govern how the coding agent creates and maintains all knowledge base wikis.

The instructions must include:

1. **The Three Layers:** Raw sources (immutable), the Wiki (LLM-maintained markdown), and the Schema (per-knowledge-base conventions).
2. **The Wiki-of-Wikis Concept:** Because this prototype requires multiple independent knowledge bases (one per domain: business registry, sanctions, procurement, customs), maintain a global `kb-registry/index.md` that acts as a catalog of all knowledge bases. Each entry links to the base's own `index.md` and includes a one-line domain summary.
3. **When to Create a New Wiki:** A new wiki directory (`/data/kb-{name}/wiki/`) is created when a new domain-specific dataset is introduced. The coding agent runs an Ingest pass (FR-204) to populate it.
4. **When to Update an Existing Wiki:** A wiki is updated when new raw sources are added, when contradictions are discovered during Lint (FR-204), or when the schema evolves. Updates are performed by the coding agent, not at runtime by the UI.
5. **Page Types:** Entity pages, Concept pages, Source summaries, Synthesis pages, and the special `index.md` and `log.md` files.
6. **Cross-Reference Convention:** All inter-page links use `[[wikilink]]` syntax. Every entity page must have a Connections section with bidirectional links.
7. **Frontmatter Standard:** Every wiki page must include YAML frontmatter with at minimum: `type`, `date_created`, `source_count`, and `status`.
8. **Ingest Workflow:** Read raw source → discuss key takeaways → write source summary → update index → update all relevant entity and concept pages → append to log.
9. **Query Workflow:** Read `index.md` → identify relevant pages → read them → synthesize answer with `[[wikilink]]` citations.
10. **Lint Workflow:** Scan for contradictions, stale claims, orphan pages, missing concept pages, and data gaps. Suggest new sources or questions.

Treat this document as the schema equivalent of Karpathy's `CLAUDE.md`, but scoped to this investigative journalism prototype and extended to handle multiple wikis.

**FRD Reference:** FR-201 through FR-204 (Karpathy Knowledge Backbone), Section 4.1, Appendix A

**Acceptance Criteria:**
- [ ] `/docs/LLM_WIKI_MASTER_INSTRUCTIONS.md` exists and covers all 10 points above.
- [ ] `/data/kb-registry/index.md` exists as the wiki-of-wikis catalog, even if empty initially.
- [ ] A sample knowledge base (`/data/kb-demo/`) exists with the full directory structure (raw, wiki, schema.md) to prove the pattern works.

---

## Task 0.4: Global Configuration Store

Implement an in-memory configuration store (backend) and a settings form (frontend) that satisfies FR-107.

Backend:
- An API endpoint `POST /api/config` that accepts `{ apiBaseUrl, modelName }`.
- Validation that `apiBaseUrl` is a valid HTTPS URL.
- The config is held in memory for the session. No persistent database.

Frontend:
- A settings page accessible from the top navigation.
- Two input fields: "LLM API Base URL" and "Model Name".
- A "Save & Reset Sessions" button that warns the user if agents are already running.

**FRD Reference:** FR-107 (Configuration Page)

**Acceptance Criteria:**
- [ ] Config values are readable by all agent constructors.
- [ ] Changing config while agents are running shows a warning and requires confirmation.
- [ ] Invalid URLs are rejected with a clear error message.

---

## Sprint 0 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 1.**

**Do not proceed to Sprint 1 until all acceptance criteria have been met.**
