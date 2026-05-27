# Demo Script: AI-Assisted Investigative Journalism Prototype

## Setup (before demo)

1. Ensure dependencies are installed: `npm install`
2. Start the dev server: `npm run dev`
3. Open browser to `http://localhost:5173`

## Demo Flow

### 1. Configuration (FR-107)
- Click **Settings** in the top bar.
- Enter a valid HTTPS LLM API Base URL (e.g., `https://api.openai.com`) and Model Name (e.g., `gpt-4o`).
- Click **Save & Reset Sessions**.

### 2. Tip Entry (FR-101)
- In the left pane, enter the tip:
  > "Company linked to sanctioned directors in procurement contracts"
- Click **Start Investigation**.
- Observe loading state while the Relevance Scoring Agent reads all knowledge base indexes.

### 3. Active Knowledge Base Panel (FR-102)
- Three bases activate: **kb-business-registry**, **kb-sanctions**, **kb-procurement**.
- Each shows a relevance score and justification.
- Try unchecking one base and clicking **Re-run Investigation** to see the swarm re-execute.

### 4. Connection Graph Navigator (FR-103)
- In the center pane, an interactive graph appears with:
  - Nodes: companies (blue), people (red), contracts (green)
  - Edges: co-occurrence links with provenance labels
- Hover over edges to see which knowledge bases link them.
- Click an edge (e.g., between **Jens Hansen** and **NorthStar Procurement Inc**).

### 5. Writing Agent (FR-304)
- After clicking an edge, the Writing Agent drafts a paragraph using only swarm evidence.
- The paragraph appears in the **Verification Dashboard** with its citation trail.

### 6. Verification Dashboard (FR-105)
- Side-by-side view: draft on the left, source passages on the right.
- Click **Verify** to run the Verification Agent.
- If **VERIFIED**, click **Accept into Composer**.
- If **FLAGGED**, the reason is shown (e.g., "inferred relationship").

### 7. Note-Block Composer (FR-104)
- Accepted blocks accumulate in the right pane.
- Blocks can be reordered (↑/↓) or deleted.
- Click **Export as Markdown** to download the draft.

### 8. Clarifying Question Terminal (FR-106)
- In the bottom-left chat, ask:
  > "Does Director Y have other companies?"
- The Question Router dispatches to the relevant base.
- New evidence updates the Connection Graph dynamically.

### 9. Auditability Check
- Open `logs/llm-debug.log` to verify each agent used a unique `instanceId`.
- Confirm no two agents share an LLM session.

## Expected Outcome

- Full flow completes without page reloads.
- The composer contains only swarm-derived, verified content.
- Cross-source connections between Jens Hansen, NorthStar Procurement Inc, and sanctions are visible.
