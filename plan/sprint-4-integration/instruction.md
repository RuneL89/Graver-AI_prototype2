# Sprint 4: Integration & End-to-End

**Goal:** Wire all components together, test the full flow, and prepare the demo.

**DO NOT proceed to Sprint 5 until ALL acceptance criteria below are met.**

---

## Task 4.1: Backend API Endpoints

Implement the following REST API endpoints:

- `POST /api/config` — Save LLM config (FR-107).
- `GET /api/config` — Read current LLM config.
- `POST /api/investigate` — Accept tip, run Relevance Scorer + Swarm + Connection Agent. Returns graph.
- `POST /api/write` — Accept connectionId, run Writing Agent. Returns draft paragraph.
- `POST /api/verify` — Accept draft paragraph, run Verification Agent. Returns status.
- `POST /api/clarify` — Accept question, run Question Router. Returns updated graph.

Ensure each endpoint properly instantiates agents with independent LLM sessions and passes the global config.

**FRD Reference:** FR-101 through FR-107, FR-301 through FR-306

**Acceptance Criteria:**
- [ ] All endpoints exist and return correct JSON.
- [ ] Each endpoint invocation creates fresh agent instances.
- [ ] Errors return 500 with descriptive messages.

---

## Task 4.2: Frontend State Management

Implement a global state store (e.g., Zustand, Redux, or plain React Context) that holds:
- Current LLM config.
- Active tip text.
- Activated knowledge bases.
- Current graph data.
- Accumulated note-blocks.
- Conversation history.

The store should update reactively when backend responses arrive.

**FRD Reference:** Section 5.3 (Real-Time Updates)

**Acceptance Criteria:**
- [ ] All UI components read from and write to the global store.
- [ ] Updates propagate without full page reloads.

---

## Task 4.3: End-to-End Flow Test

Manually or automatically test the complete Use Case from FRD Section 7:

1. Configure LLM endpoint.
2. Enter tip about Company X and procurement/sanctions.
3. Verify Relevance Scorer activates correct bases.
4. Verify Swarm returns evidence.
5. Verify Connection Graph renders.
6. Click an edge, verify Writing Agent drafts a paragraph using only swarm data.
7. Verify Verification Agent checks it.
8. Accept into Composer.
9. Ask a clarifying question, verify graph updates.

**FRD Reference:** Section 7 (Use Case: End-to-End Investigation)

**Acceptance Criteria:**
- [ ] The full flow completes without errors.
- [ ] Each agent uses its own LLM session (verify via debug logs).
- [ ] The composer only contains swarm-derived, verified content.

---

## Task 4.4: Demo Preparation

Prepare the prototype for demonstration.

- Record a short demo script matching the Use Case.
- Ensure the demo datasets are loaded and wikis are linted.
- Verify the UI is responsive and all agents respond within acceptable time (FRD Section 6.1).
- Create a `README.md` at project root with setup instructions.

**FRD Reference:** Section 6.1 (Performance), Section 7 (Use Case)

**Acceptance Criteria:**
- [ ] Demo script exists in `/docs/demo-script.md`.
- [ ] Setup instructions allow a fresh clone to run with `npm install && npm run dev`.
- [ ] All acceptance criteria from Sprints 0–3 are met.

---

## Sprint 4 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] End-to-end flow test is completed successfully.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 5.**

**Do not proceed to Sprint 5 until all acceptance criteria have been met.**
