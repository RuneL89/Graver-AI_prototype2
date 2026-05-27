# Sprint 3: Journalist Perspective UI (Group 1)

**Goal:** Build the browser-facing interface. The UI only reads from the compiled wiki layer. It does not create or modify wikis.

**DO NOT proceed to Sprint 4 until ALL acceptance criteria below are met.**

---

## Task 3.1: Configuration Page (FR-107)

Implement the settings page as described in Sprint 0, Task 0.4. If not already complete, finish it now.

- Top navigation settings icon.
- Fields: LLM API Base URL (HTTPS), Model Name.
- Save triggers a backend update. Reset warning if agents are running.

**FRD Reference:** FR-107 (Configuration Page)

**Acceptance Criteria:**
- [ ] Matches all acceptance criteria from Task 0.4.

---

## Task 3.2: Tip Entry Portal (FR-101)

Implement a prominent input field in the left pane.

- Large textarea with placeholder text.
- Submit button labeled "Start Investigation".
- On submit, the tip text is sent to the backend endpoint `POST /api/investigate`.
- The backend triggers the Relevance Scoring Agent (FR-301) and returns the activated base list.
- The tip text remains visible at the top of the left pane for the entire session.

**FRD Reference:** FR-101 (Tip Entry Portal)

**Acceptance Criteria:**
- [ ] Submit triggers the relevance scorer.
- [ ] The tip is preserved and visible throughout the session.
- [ ] The UI shows a loading state while the scorer runs.

---

## Task 3.3: Active Knowledge Base Panel (FR-102)

Implement a panel below the Tip Entry Portal.

- Lists each activated base with its relevance justification.
- Each base has a checkbox. Unchecking removes it from the swarm; checking adds it.
- Changes trigger a re-run of the Parallel Research Swarm (FR-302).
- A "Re-run Investigation" button appears if the user modifies the panel.

**FRD Reference:** FR-102 (Active Knowledge Base Panel)

**Acceptance Criteria:**
- [ ] Bases are listed with justifications.
- [ ] Manual override triggers swarm re-execution.
- [ ] The panel updates when the Question Router adds new evidence.

---

## Task 3.4: Connection Graph Navigator (FR-103)

Implement an interactive graph in the center pane.

- Use a graph visualization library (e.g., D3.js, Cytoscape.js, or vis-network).
- Render nodes and edges from the Connection Agent output (FR-303).
- Nodes are color-coded by type (person, company, contract, event).
- Edges show provenance labels on hover.
- Clicking an edge or node triggers the Writing Agent (FR-304) and shows a loading indicator.
- The graph updates dynamically when the Question Router returns new evidence.

**FRD Reference:** FR-103 (Connection Graph Navigator)

**Acceptance Criteria:**
- [ ] The graph renders correctly from Connection Agent JSON.
- [ ] Clicking an edge triggers the Writing Agent.
- [ ] Dynamic updates do not reset the user's current view.

---

## Task 3.5: Note-Block Composer (FR-104)

Implement the composer in the right pane.

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

**FRD Reference:** FR-104 (Note-Block Composer)

**Acceptance Criteria:**
- [ ] Composer is locked until swarm completes.
- [ ] Only verified blocks from swarm data can be added.
- [ ] Export produces valid markdown with citations.

---

## Task 3.6: Verification Dashboard (FR-105)

Implement a panel above the Note-Block Composer.

- Side-by-side view: drafted note-block on the left, source passages on the right.
- Status badge: Verified (green), Pending (yellow), Flagged (red).
- For Flagged blocks, the specific reason is displayed.
- "Accept into Composer" button for Verified blocks.
- "Reject" button for Flagged blocks.

**FRD Reference:** FR-105 (Verification Dashboard)

**Acceptance Criteria:**
- [ ] Side-by-side view renders correctly.
- [ ] Status badges are accurate per Verification Agent output.
- [ ] Accept/Reject buttons update the composer state.

---

## Task 3.7: Clarifying Question Terminal (FR-106)

Implement a chat interface at the bottom of the left pane.

- Text input with send button.
- Messages are sent to `POST /api/clarify`.
- The backend routes through the Question Router (FR-306).
- Responses update the Connection Graph Navigator and Active KB Panel.
- Conversation history is maintained for the session.

**FRD Reference:** FR-106 (Clarifying Question Terminal)

**Acceptance Criteria:**
- [ ] Questions are sent and responses received.
- [ ] Graph updates when new evidence arrives.
- [ ] History persists for the session.

---

## Sprint 3 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 4.**

**Do not proceed to Sprint 4 until all acceptance criteria have been met.**
