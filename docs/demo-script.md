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

### 2. Load Demo Data
- Click **Load Demo Data**.
- Verify all three bases (`kb-business-registry`, `kb-sanctions`, `kb-procurement`) load.
- Open **Wiki Manager**, verify schemas are loaded and valid.

### 3. Explore Wiki (NEW)
- Open **Wiki Manager** → click **View** on `kb-business-registry`.
- Browse entity pages (Jens Hansen, Oceanic Logistics Ltd, etc.).
- Click `[[wikilink]]` links to navigate between pages.
- Show the index structure (Entities, Concepts, Sources, Synthesis) and the log.

### 4. Upload Document (NEW)
- Create a new wiki `kb-test` via **Wiki Manager**.
- Drop a small text or PDF document into the **Document Uploader**.
- Observe progress: "Extracting text… → Analyzing with LLM… → Updating wiki… → Done".
- Open **WikiViewer** for `kb-test`, show the new source summary and entity pages.
- Verify that `index.md` entries have descriptive one-line summaries after the em-dash.

### 5. Tip Entry (FR-101)
- In the left pane, enter the tip:
  > "Company linked to sanctioned directors in procurement contracts"
- Click **Start Investigation**.
- Observe loading state while the Relevance Scoring Agent reads all knowledge base indexes.

### 6. Active Knowledge Base Panel (FR-102)
- Three bases activate: **kb-business-registry**, **kb-sanctions**, **kb-procurement**.
- Each shows a relevance score and justification.
- Try unchecking one base and clicking **Re-run Investigation** to see the swarm re-execute.

### 7. Connection Graph Navigator (FR-103)
- In the center pane, an interactive graph appears with:
  - Nodes: companies (blue), people (red), contracts (green)
  - Edges: co-occurrence links with provenance labels
- Hover over edges to see which knowledge bases link them.
- Click an edge (e.g., between **Jens Hansen** and **NorthStar Procurement Inc**).

### 8. Writing Agent (FR-304)
- After clicking an edge, the Writing Agent drafts a paragraph using only swarm evidence.
- The paragraph appears in the **Verification Dashboard** with its citation trail.

### 9. Verification Dashboard (FR-105)
- Side-by-side view: draft on the left, source passages on the right.
- Click **Verify** to run the Verification Agent.
- If **VERIFIED**, you can click **Accept into Composer** or **File to Wiki**.
- If **FLAGGED**, the reason is shown (e.g., "inferred relationship").

### 10. File to Wiki (NEW)
- After verifying a block, click **File to Wiki**.
- Select target KB (e.g., `kb-business-registry`) and confirm.
- Open **WikiViewer**, verify the new synthesis page appears under the Synthesis section.
- Verify entity pages in the synthesis have backlinks to the synthesis page.

### 11. Note-Block Composer (FR-104)
- Accepted blocks accumulate in the right pane.
- Blocks can be reordered (↑/↓), deleted, or filed to the wiki individually.
- Click **Export as Markdown** to download the draft.

### 12. Clarifying Question Terminal (FR-106)
- In the bottom-left chat, ask:
  > "Does Director Y have other companies?"
- The Question Router dispatches to the relevant base.
- New evidence updates the Connection Graph dynamically.
- Click **Save Answer to Wiki** to file the question and evidence as a synthesis page.

### 13. Lint (NEW)
- Run **Lint** on `kb-business-registry` from **Wiki Manager**.
- Review the color-coded report:
  - Red: contradictions, stale claims
  - Yellow: orphans, missing concepts, data gaps
  - Blue: broken links, suggestions
- Verify lint results are recorded in `log.md`.

### 14. Auditability Check
- Open `logs/llm-debug.log` to verify each agent used a unique `instanceId`.
- Confirm no two agents share an LLM session.

## Expected Outcome

- Full flow completes without page reloads.
- The composer contains only swarm-derived, verified content.
- Cross-source connections between Jens Hansen, NorthStar Procurement Inc, and sanctions are visible.
- The wiki grows through both document ingestion and investigation writeback.
- Synthesis pages are properly indexed and linked bidirectionally.
