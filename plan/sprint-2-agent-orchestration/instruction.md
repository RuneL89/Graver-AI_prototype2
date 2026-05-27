# Sprint 2: Agent Orchestration (Group 3)

**Goal:** Build all six agents. Each agent must be an independent LLM session using the global config (FR-107). All agents query the Compiled Wiki Layer, not raw documents directly.

**DO NOT proceed to Sprint 3 until ALL acceptance criteria below are met.**

---

## Task 2.1: Relevance Scoring Agent (FR-301)

Implement the Relevance Scoring Agent as a standalone module in `/src/agents/relevance-scorer.js`.

- It instantiates its own `LLMClient` with the global config.
- It reads `index.md` from every knowledge base listed in `kb-registry/index.md`.
- It scores the journalist's tip against each base using an LLM prompt that considers entity names, concept coverage, and domain overlap.
- It returns a ranked array: `[{ kbName, score, justification, activated: score > threshold }]`.
- The threshold is read from the global config or defaults to 0.6.

**FRD Reference:** FR-301 (Relevance Scoring Agent)

**Acceptance Criteria:**
- [ ] Given a tip, it returns a ranked list of knowledge bases with justifications.
- [ ] It only instantiates one LLM session for its own work.
- [ ] It does not share state with any other agent.

---

## Task 2.2: Parallel Research Agent Swarm (FR-302)

Implement the Parallel Research Swarm as a swarm orchestrator plus individual research agents.

- The orchestrator accepts a tip and a list of activated knowledge bases from the Relevance Scoring Agent.
- It spawns one `ResearchAgent` per activated base using `Promise.all` or worker threads.
- Each `ResearchAgent` instantiates its own `LLMClient`.
- Each agent reads its assigned base's `index.md`, identifies relevant pages, reads them, and extracts passages and entities matching the tip.
- Each agent returns a structured evidence bundle: `{ kbName, passages: [{ text, sourcePage, entityRefs }], entities: [{ name, type, wikiPage }] }`.
- The swarm waits for all agents to complete before returning the aggregated bundles.

**FRD Reference:** FR-302 (Parallel Research Agent Swarm)

**Acceptance Criteria:**
- [ ] Multiple agents run concurrently without blocking each other.
- [ ] Each agent uses its own LLM session.
- [ ] The output is an array of evidence bundles, one per knowledge base.
- [ ] A slow agent does not prevent others from completing.

---

## Task 2.3: Connection Agent (FR-303)

Implement the Connection Agent in `/src/agents/connection-agent.js`.

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

**FRD Reference:** FR-303 (Connection Agent)

**Acceptance Criteria:**
- [ ] It produces a valid graph with nodes and edges.
- [ ] Cross-source connections have provenance arrays.
- [ ] It flags potential alias matches for human review.

---

## Task 2.4: Writing Agent (FR-304)

Implement the Writing Agent in `/src/agents/writing-agent.js`.

**Critical Constraints:**
- The agent shall only consume data originating from the Parallel Research Swarm (FR-302). It shall not access external sources, static templates, or pre-loaded content outside the swarm evidence bundles.
- The agent shall not execute or produce output until the Parallel Research Swarm has completed and delivered its evidence bundles.

Implementation:
- It instantiates its own `LLMClient`.
- It accepts a `connectionId` (representing a clicked graph edge or node) and the full swarm evidence bundles.
- It locates the relevant passages within the bundles for that connection.
- It prompts the LLM to write a single paragraph explaining the connection, citing exact sources and passages.
- It returns `{ paragraph, citations: [{ source, passage, wikiPage }] }`.

**FRD Reference:** FR-304 (Writing Agent)

**Acceptance Criteria:**
- [ ] It refuses to run if swarm bundles are not provided.
- [ ] Its output cites only passages found in the swarm data.
- [ ] It uses its own independent LLM session.

---

## Task 2.5: Verification Agent (FR-305)

Implement the Verification Agent in `/src/agents/verification-agent.js`.

- It instantiates its own `LLMClient`.
- It accepts a note-block (paragraph + citations) and the raw source vault paths.
- It confirms:
  1. Cited entities exist in the raw sources.
  2. The relationship is explicitly stated in source text, not inferred.
  3. No passages were taken out of context.
- It returns `{ status: "VERIFIED" | "FLAGGED", reason: "..." | null }`.
- For verification, it may read the raw source files directly (this is the only agent permitted to do so for audit purposes).

**FRD Reference:** FR-305 (Verification Agent)

**Acceptance Criteria:**
- [ ] It correctly flags inferred relationships.
- [ ] It correctly flags out-of-context passages.
- [ ] It correctly verifies explicitly stated facts.
- [ ] It uses its own independent LLM session.

---

## Task 2.6: Question Router (FR-306)

Implement the Question Router in `/src/agents/question-router.js`.

- It instantiates its own `LLMClient`.
- It accepts a clarifying question from the journalist and the current session context (previous questions, active knowledge bases).
- It reads the `index.md` of all active knowledge bases to identify which bases might answer the question.
- It formulates a targeted query per relevant base.
- It dispatches to new `ResearchAgent` instances (reusing the swarm pattern from FR-302).
- It integrates returning evidence into the existing graph and note-blocks.

**FRD Reference:** FR-306 (Question Router)

**Acceptance Criteria:**
- [ ] It routes questions to the correct knowledge bases.
- [ ] It maintains session context across multiple questions.
- [ ] It triggers graph updates when new evidence arrives.
- [ ] It uses its own independent LLM session.

---

## Cross-Cutting Concerns for Sprint 2

### LLM Session Isolation
Verify throughout all tasks that no two agents share an LLM session. The simplest check: log the `LLMClient` instance ID or a UUID at agent initialization. If two agents log the same ID, the isolation requirement is violated.

### Swarm-Only Data Constraint
Enforce at the code level that the Writing Agent and Note-Block Composer cannot access data outside the swarm evidence bundles. The Writing Agent constructor should require `swarmBundles` as a mandatory argument and throw if absent.

**FRD Reference:** Section 3.3 (Agent Orchestration), Section 6.2 (Auditability)

---

## Sprint 2 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] LLM session isolation is verified via debug logs.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 3.**

**Do not proceed to Sprint 3 until all acceptance criteria have been met.**
