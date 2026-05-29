# Sprint 1: Schema as Active Configuration

**Goal:** Make the per-knowledge-base schema an active configuration document that is injected into every LLM prompt that operates on the wiki. Create a helper that reads the schema and prepends it to agent system prompts. Verify that schema changes affect agent behavior.

**DO NOT proceed to Sprint 2 until ALL acceptance criteria below are met.**

---

## Task 1.1: Audit Current Schema Storage and Usage

Search the entire `src/` tree for:
- `getSchema`
- `setSchema`
- `schema`
- `schema.md`

Document:
- Where the schema is stored (`wiki.${kbName}.meta:schema` in IndexedDB)
- Where it is written (`WikiManager.jsx` textarea, `createKnowledgeBase`)
- Where it is read (only `WikiManager.jsx` currently)
- Which agents do NOT read it (all of them, currently)

**Acceptance Criteria:**
- [ ] A complete inventory of schema read/write locations exists.
- [ ] The inventory confirms that no agent currently consumes the schema.

---

## Task 1.2: Create `buildAgentSystemPrompt` Helper

Create a new utility module at `src/shared/schema-loader.js` (or extend `src/shared/llm-client.js`) that exports:

```js
export async function buildAgentSystemPrompt(kbName, baseSystemPrompt) {
  const schema = await getSchema(kbName);
  const header = schema
    ? `## Knowledge Base Schema\n\n${schema}\n\n---\n\n`
    : '';
  return `${header}${baseSystemPrompt}`;
}
```

If `kbName` is null or undefined (for agents that operate across multiple KBs), collect schemas from all active bases and concatenate them with KB name headers.

**Acceptance Criteria:**
- [ ] `buildAgentSystemPrompt` exists and is exported.
- [ ] It reads the schema from `wikiStore.getSchema(kbName)`.
- [ ] It prepends the schema to the base system prompt.
- [ ] It handles missing schemas gracefully (returns base prompt unchanged).

---

## Task 1.3: Update All Agents to Use Schema-Prefixed Prompts

Update every agent that instantiates `LLMClient` to call `buildAgentSystemPrompt` before calling `sendMessage`.

**Agents to update (all agents except Writing Agent need structural changes; Writing Agent only needs prompt update):**

### `src/agents/relevance-scorer.js`
- Currently: `const client = new LLMClient(config);`
- Change: For each KB, build a system prompt that includes the KB's schema.
- **Critical for index-first architecture:** The Relevance Scorer reads *only* `index.md` (as markdown) and the schema. It never loads entity pages. The schema gives it domain-specific signals for ranking (e.g. "procurement bases are high-priority for government-contract tips").

### `src/agents/swarm-orchestrator.js`
- Each `researchAgent` operates on one KB.
- The system prompt for each agent should include that KB's schema.

### `src/agents/connection-agent.js`
- Operates across multiple KBs.
- The system prompt should include schemas from all activated bases.

### `src/agents/writing-agent.js`
- **Minimal change required.** The Writing Agent is insulated from wiki storage format by the swarm bundle abstraction. It only needs schema injection.
- Include the schema from the primary KB of the connection being written about.
- This ensures the agent follows domain-specific citation formats (e.g. `[[Entity Name]](source:raw/filename.pdf)` per the schema).

### `src/agents/verification-agent.js`
- Operates on citations from multiple KBs.
- Include schemas from all cited KBs.

### `src/agents/question-router.js`
- Routes questions across active bases.
- Include schemas from all active bases.

**Implementation Pattern:**
```js
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';

async function researchAgent(tip, kbName, config) {
  const client = new LLMClient(config);
  const systemPrompt = await buildAgentSystemPrompt(kbName,
    'You search a wiki for evidence related to an investigative tip. Return only JSON.'
  );
  const raw = await client.sendMessage(systemPrompt, userPrompt, 0.2);
}
```

**Acceptance Criteria:**
- [ ] Every agent's `sendMessage` call uses a schema-prefixed system prompt.
- [ ] No agent uses a hard-coded generic system prompt without schema context.
- [ ] Console logs show that the schema text is included in the prompt (log the first 200 chars).
- [ ] **The Relevance Scoring Agent's prompt includes the schema and the raw markdown index (no entity pages).**

---

## Task 1.4: Verify Schema Affects Agent Behavior

Create a test scenario to prove that the schema is actually being consumed:

1. Load demo data.
2. Open WikiManager, select `kb-business-registry`.
3. Edit the schema to add a rule: `"When scoring relevance, always rank procurement-related bases higher than registry bases."`
4. Save the schema.
5. Enter a tip about procurement.
6. Verify that the Relevance Scoring Agent's justification mentions the schema rule or produces a different score than before.

**Note:** The schema edit UI in `WikiManager` is currently a textarea. For this test, you can edit it directly. In production, schema edits are coding-agent operations, but for testing the mechanism, the UI textarea is sufficient.

**Alternative test:**
1. Load demo data.
2. Edit the `kb-sanctions` schema to say: `"All entities mentioned in sanctions must be flagged with severity: critical."`
3. Run an investigation that touches `kb-sanctions`.
4. Check the swarm output or graph node metadata for a `severity: critical` flag.

**Acceptance Criteria:**
- [ ] A schema change produces a detectable change in agent output.
- [ ] **Specifically: adding a relevance rule to the schema changes the Relevance Scoring Agent's rankings.**
- [ ] The change is logged to `logs/llm-debug.log` or console.

---

## Task 1.5: Schema Validation Helper

Create a helper in `src/shared/schema-loader.js` that validates a schema markdown string for required sections:

```js
export function validateSchema(schemaText) {
  const required = ['Page Types', 'Ingest Rules', 'Query Behavior', 'Citation Format'];
  const missing = required.filter((section) => !schemaText.includes(section));
  return { valid: missing.length === 0, missing };
}
```

Call this validation when:
- A knowledge base is created (`createKnowledgeBase`)
- Demo data is loaded (`demoLoader.js`)
- Lint runs (`lint.js`)

Log a warning if a schema is missing required sections.

**Acceptance Criteria:**
- [ ] `validateSchema` checks for the four required sections.
- [ ] Missing sections trigger a console warning.
- [ ] `lint.js` reports schema completeness as part of its output.

---

## Task 1.6: Update `WikiManager.jsx` Schema Display

In `src/ui/components/WikiManager.jsx`, the schema is currently editable via a textarea. Update the UI to:

1. Display the schema in a read-only `<pre>` or styled `<div>` by default.
2. Show a warning badge if the schema is missing required sections.
3. Keep the textarea behind an "Edit Schema" toggle (for coding-agent use only; the journalist should not normally edit it).

**Acceptance Criteria:**
- [ ] The schema is displayed read-only by default.
- [ ] A warning badge appears if required sections are missing.
- [ ] An "Edit Schema" toggle reveals the textarea.

---

## Task 1.7: Ensure Demo Data Schemas Are Loaded

Verify that `demoLoader.js` loads the `schema.md` content from the demo bundle into IndexedDB. If the demo JSON bundles do not contain a `schemaText` field, update the bundles or the loader to read from `data/kb-{name}/schema.md` at build time.

**Acceptance Criteria:**
- [ ] After loading demo data, `getSchema('kb-business-registry')` returns the content of `data/kb-business-registry/schema.md`.
- [ ] The schema is non-empty and contains required sections.

---

## Sprint 1 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] `npm run build` completes without errors.
- [ ] Every agent prompt includes the schema (verified via console logs).
- [ ] A schema change produces a detectable change in agent behavior.
- [ ] The investigation flow still works end-to-end.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 2.**

**Do not proceed to Sprint 2 until all acceptance criteria have been met.**
