# Sprint 3: Writeback and Compounding

**Goal:** Allow investigation answers to be filed back into the wiki as synthesis pages. The Writing Agent's paragraphs and the Question Router's answers can be persisted, making the wiki grow through queries as well as ingests. Update the index and log when synthesis pages are created.

**DO NOT proceed to Sprint 4 until ALL acceptance criteria below are met.**

---

## Task 3.1: Design the Synthesis Page Format

Define the markdown format for synthesis pages. These pages represent compiled analysis from investigations.

**Template:**
```markdown
---
type: synthesis
date_created: 2026-05-29
source_count: 3
status: active
query: "Company linked to sanctioned directors in procurement contracts"
---

# Synthesis: {Title}

## Question
{The original tip or clarifying question}

## Analysis
{The Writing Agent paragraph}

## Evidence
- [[kb-business-registry]] — {relevant passage summary}
- [[kb-sanctions]] — {relevant passage summary}

## Key Entities
- [[Jens Hansen]]
- [[NorthStar Procurement Inc]]

## Citations
- {source knowledge base}: {exact passage text}
```

Store this template as a constant in `src/lib/wikiStore.js` or a new `src/lib/templates.js`.

**Acceptance Criteria:**
- [ ] A synthesis page template exists with YAML frontmatter.
- [ ] The template includes question, analysis, evidence, entities, and citations sections.
- [ ] The template uses `[[wikilink]]` syntax for all entity references.

---

## Task 3.2: Create `saveSynthesisPage` Helper

Create a helper in `src/lib/wikiStore.js`:

```js
export async function saveSynthesisPage(kbName, { title, query, analysis, evidence, citations }) {
  const content = buildSynthesisMarkdown({ title, query, analysis, evidence, citations });
  await saveWikiPage(kbName, 'synthesis', title, content, {
    source_count: citations.length,
    status: 'active',
    date_created: new Date().toISOString().split('T')[0],
  });
  
  // Update index
  const indexMd = await readWikiIndex(kbName);
  const updatedIndex = indexMd + `\n- [[${title}]] — ${new Date().toISOString().split('T')[0]}`;
  await updateWikiIndex(kbName, updatedIndex);
  
  // Update log
  await appendWikiLog(kbName, `query | ${query.slice(0, 80)} — Filed synthesis: ${title}`);
}
```

**Acceptance Criteria:**
- [ ] `saveSynthesisPage` creates a synthesis page.
- [ ] It updates `index.md` with the new entry.
- [ ] It appends to `log.md`.
- [ ] It returns the page title on success.

---

## Task 3.3: Update Writing Agent to Return Full Markdown

**Note:** The Writing Agent requires only a **minor enhancement** in this sprint. Its core drafting logic (reading swarm bundles, filtering by connection, calling LLM) is unchanged. We only add optional return fields for writeback.

Update `src/agents/writing-agent.js` to optionally return a full synthesis markdown string in addition to the plain paragraph:

```js
export async function draftParagraph(connectionId, swarmBundles, config) {
  // ... existing logic to draft paragraph ...
  
  return {
    paragraph,
    citations,
    suggestedTitle: `Connection: ${connectionId}`,
    suggestedMarkdown: buildSynthesisMarkdown({
      title: `Connection: ${connectionId}`,
      query: null, // filled in by caller
      analysis: paragraph,
      evidence: citations.map((c) => ({ kb: c.source, passage: c.passage })),
      citations,
    }),
  };
}
```

**Acceptance Criteria:**
- [ ] `draftParagraph` returns `suggestedTitle` and `suggestedMarkdown`.
- [ ] The suggested markdown uses the synthesis page template.
- [ ] Existing callers that only use `paragraph` and `citations` are not broken.
- [ ] **The Writing Agent's core drafting logic is unchanged; only return shape is extended.**

---

## Task 3.4: Add "File to Wiki" Button to Verification Dashboard

In `src/ui/components/VerificationDashboard.jsx`, add a "File to Wiki" button next to the "Accept into Composer" button.

**Behavior:**
1. When a block is verified, show two buttons: "Accept into Composer" and "File to Wiki".
2. Clicking "File to Wiki" opens a small dialog:
   - Select target knowledge base (dropdown of active bases)
   - Edit title (pre-filled with Writing Agent's `suggestedTitle`)
   - Preview the markdown
   - Confirm button
3. On confirm, call `saveSynthesisPage(kbName, data)`.
4. Show success message: "Filed to wiki as [[Title]]".
5. Disable the button after filing to prevent duplicates.

**Acceptance Criteria:**
- [ ] "File to Wiki" button appears for verified blocks.
- [ ] Dialog allows selecting target KB and editing title.
- [ ] Filing creates a synthesis page in the selected KB.
- [ ] The index and log are updated.
- [ ] Button is disabled after successful filing.

---

## Task 3.5: Add "File to Wiki" Button to Note-Block Composer

In `src/ui/components/NoteBlockComposer.jsx`, add a "File All to Wiki" button at the bottom.

**Behavior:**
1. Clicking "File All to Wiki" files each note-block as a separate synthesis page.
2. Or, add a per-block "File" button (preferred for granularity).
3. Use the block's content and citations to build the synthesis page.

**Acceptance Criteria:**
- [ ] Note-Block Composer has a way to file blocks to the wiki.
- [ ] Filed blocks are tracked (e.g. a small "✓ Filed" badge).
- [ ] The wiki index is updated for each filed block.

---

## Task 3.6: Add "Save Answer to Wiki" to Clarifying Question Terminal

In `src/ui/components/ClarifyingQuestionTerminal.jsx`, after displaying the Question Router's answer, show a "Save Answer to Wiki" button.

**Behavior:**
1. The answer text and related evidence are compiled into a synthesis page.
2. User selects target KB and confirms.
3. The answer is filed as a synthesis page with `query` set to the user's question.

**Acceptance Criteria:**
- [ ] "Save Answer to Wiki" button appears after each answer.
- [ ] The saved page includes the original question.
- [ ] The index and log are updated.

---

## Task 3.7: Update WikiViewer to Show Synthesis Pages

Ensure `src/ui/components/WikiViewer.jsx` displays synthesis pages in the sidebar and renders them correctly.

**Acceptance Criteria:**
- [ ] Synthesis pages appear in the sidebar under the "Synthesis" section.
- [ ] Clicking a synthesis page renders its markdown correctly.
- [ ] `[[wikilink]]` links inside synthesis pages navigate to entity/concept pages.

---

## Task 3.8: Test the Compounding Loop

Run an end-to-end test:
1. Ingest a document into `kb-demo`.
2. Enter a tip and run investigation.
3. Draft a paragraph, verify it.
4. File the paragraph to `kb-demo` as a synthesis page.
5. Open WikiViewer, verify the synthesis page appears.
6. Run lint, verify no structural issues with the new page.
7. Enter a clarifying question, save the answer to the wiki.
8. Verify the wiki now contains more pages than it started with.

**Acceptance Criteria:**
- [ ] The wiki grows after filing an investigation answer.
- [ ] The new synthesis page is properly linked in the index.
- [ ] The log records both the query and the filing action.
- [ ] WikiViewer displays the new page with correct formatting.

---

## Sprint 3 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] `npm run build` completes without errors.
- [ ] Verified note-blocks can be filed to the wiki.
- [ ] Clarifying question answers can be saved to the wiki.
- [ ] The wiki grows through both ingestion and investigation.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 4.**

**Do not proceed to Sprint 4 until all acceptance criteria have been met.**
