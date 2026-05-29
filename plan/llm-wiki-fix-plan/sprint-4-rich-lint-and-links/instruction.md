# Sprint 4: Rich Lint and Bidirectional Links

**Goal:** Replace structural lint with LLM-driven semantic lint that detects contradictions, stale claims, orphan pages, missing concepts, and data gaps. Implement bidirectional link maintenance so that `[[wikilink]]` references are kept consistent across the wiki.

**DO NOT proceed to Sprint 5 until ALL acceptance criteria below are met.**

---

## Task 4.1: Design the Semantic Lint Prompt

Create an LLM prompt that performs a comprehensive health check on a knowledge base. The prompt must:

1. Include the schema.
2. Include the current `index.md`.
3. Include a sample of pages (all entity pages, plus a few concept/source/synthesis pages).
4. Include the `log.md` (last 20 entries).
5. Request structured output.

**Prompt Template:**
```
## Knowledge Base Schema
{schema}

## Wiki Index
{indexMd}

## Recent Log
{logMd}

## Pages to Review
{samplePages.map((p) => `--- ${p.title} ---\n${p.content}`).join('\n\n')}

You are a wiki health checker. Analyze the wiki above and return ONLY a JSON object:
{
  "contradictions": [
    {
      "pages": ["Page A", "Page B"],
      "claimA": "exact conflicting claim from Page A",
      "claimB": "exact conflicting claim from Page B",
      "severity": "high | medium | low",
      "suggestedResolution": "description"
    }
  ],
  "staleClaims": [
    {
      "page": "Page Title",
      "claim": "claim that may be outdated",
      "newerSource": "source that supersedes it",
      "severity": "high | medium | low"
    }
  ],
  "orphans": [
    {
      "page": "Page Title",
      "reason": "not in index | no inbound links"
    }
  ],
  "missingConcepts": [
    {
      "concept": "Concept Name",
      "mentionedIn": ["Page A", "Page B"],
      "suggestedDefinition": "brief description"
    }
  ],
  "dataGaps": [
    {
      "entity": "Entity Name",
      "missingField": "e.g. date of birth, registration number",
      "suggestedSource": "where to find this info"
    }
  ],
  "brokenLinks": [
    {
      "page": "Page containing dead link",
      "deadLink": "Missing Page Title"
    }
  ],
  "suggestions": [
    {
      "action": "update | create | delete | merge",
      "targetPage": "Page Title",
      "details": "what to do"
    }
  ]
}

Rules:
- A contradiction requires two explicit conflicting statements, not just missing information.
- A stale claim requires a newer source in the log that contradicts an older page.
- An orphan is a page not linked from any other page AND not in the index.
- A missing concept is a term mentioned in 2+ pages that lacks its own concept page.
- A data gap is an entity page missing a field that the schema says is required.
```

**Acceptance Criteria:**
- [ ] The lint prompt template exists as a constant in `src/lib/lint.js` or `src/agents/lint-agent.js`.
- [ ] It requests all seven categories of issues.
- [ ] It includes schema, index, pages, and log context.

---

## Task 4.2: Implement Semantic Lint Agent

Create `src/agents/lint-agent.js` (or rewrite `src/lib/lint.js`) to perform LLM-driven lint:

```js
import { LLMClient } from '../shared/llm-client.js';
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';
import { readWikiIndex, loadWikiPage, listWikiPages, appendWikiLog } from '../lib/wikiStore.js';

export async function lintWiki(kbName, config) {
  const client = new LLMClient(config);
  
  // Read context
  const schema = await buildAgentSystemPrompt(kbName, 'You are a wiki health checker.');
  const indexMd = await readWikiIndex(kbName);
  // ... collect sample pages ...
  
  // Call LLM
  const raw = await client.sendMessage(schema, userPrompt, 0.2);
  
  // Parse result
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  
  // Build report
  const report = buildLintReport(result);
  
  // Log
  await appendWikiLog(kbName, `lint | ${report.summary}`);
  
  return report;
}
```

**Acceptance Criteria:**
- [ ] `lintWiki` calls the LLM with the semantic lint prompt.
- [ ] It parses the JSON response into a structured report.
- [ ] It falls back to structural checks if the LLM call fails.
- [ ] It appends a summary to `log.md`.

---

## Task 4.3: Build Lint Report Formatter

Create a human-readable report formatter:

```js
function buildLintReport(result) {
  const lines = [];
  lines.push(`Lint Report for ${kbName}`);
  lines.push(`Contradictions: ${result.contradictions?.length || 0}`);
  lines.push(`Stale Claims: ${result.staleClaims?.length || 0}`);
  lines.push(`Orphans: ${result.orphans?.length || 0}`);
  lines.push(`Missing Concepts: ${result.missingConcepts?.length || 0}`);
  lines.push(`Data Gaps: ${result.dataGaps?.length || 0}`);
  lines.push(`Broken Links: ${result.brokenLinks?.length || 0}`);
  lines.push(`Suggestions: ${result.suggestions?.length || 0}`);
  
  if (result.suggestions?.length > 0) {
    lines.push('\nTop Suggestions:');
    for (const s of result.suggestions.slice(0, 5)) {
      lines.push(`- [${s.action}] ${s.targetPage}: ${s.details}`);
    }
  }
  
  return {
    summary: `${result.contradictions?.length || 0} contradictions, ${result.staleClaims?.length || 0} stale, ${result.suggestions?.length || 0} suggestions`,
    text: lines.join('\n'),
    structured: result,
  };
}
```

**Acceptance Criteria:**
- [ ] The report is human-readable.
- [ ] It includes counts for all seven categories.
- [ ] It lists the top 5 suggestions with action and target page.

---

## Task 4.4: Update WikiManager Lint Display

In `src/ui/components/WikiManager.jsx`, update the lint display:

1. Show severity color coding:
   - Red: contradictions, stale claims (high severity)
   - Yellow: orphans, missing concepts, data gaps (medium severity)
   - Blue: broken links, suggestions (low severity)
2. Show expandable sections for each category.
3. Show suggestion actions as buttons (for coding-agent use):
   - "Create Concept Page: {name}"
   - "Update Page: {name}"
   - These buttons can copy the suggested markdown to clipboard or log the suggestion.

**Acceptance Criteria:**
- [ ] Lint report shows color-coded severity.
- [ ] Categories are expandable/collapsible.
- [ ] Suggestions are actionable (at minimum, copy to clipboard).

---

## Task 4.5: Implement Backlink Maintenance

Create a helper in `src/lib/wikiStore.js`:

```js
export async function maintainBacklinks(kbName, sourceTitle, targetTitles) {
  for (const target of targetTitles) {
    const page = await loadWikiPage(kbName, 'entity', target)
      || await loadWikiPage(kbName, 'concept', target)
      || await loadWikiPage(kbName, 'source', target)
      || await loadWikiPage(kbName, 'synthesis', target);
    
    if (!page) continue;
    
    const content = page.content || '';
    const connectionsMatch = content.match(/## Connections\n([\s\S]*?)(?=\n## |$)/);
    const existingConnections = connectionsMatch ? connectionsMatch[1] : '';
    
    if (existingConnections.includes(`[[${sourceTitle}]]`)) continue;
    
    const newConnection = `- [[${sourceTitle}]]\n`;
    const updatedContent = content.replace(
      /## Connections\n/,
      `## Connections\n${newConnection}`
    );
    
    await saveWikiPage(kbName, page.type, page.title, updatedContent, page.frontmatter);
  }
}
```

**Integration Points:**
- Call `maintainBacklinks` after `ingestDocument` creates/updates pages.
- Call `maintainBacklinks` after `saveSynthesisPage` files a synthesis page.
- Do NOT call it during investigation (reading only).

**Acceptance Criteria:**
- [ ] After creating Page A that links to Page B, Page B's Connections section includes Page A.
- [ ] After filing a synthesis page that references an entity, the entity page links back.
- [ ] Duplicate backlinks are not created.
- [ ] Backlinks are created for all page types (entity, concept, source, synthesis).

---

## Task 4.6: Test Bidirectional Links

Run a test:
1. Ingest a document that creates Entity A and Entity B, where A's content mentions `[[B]]`.
2. Verify that B's Connections section includes `[[A]]`.
3. File a synthesis page that mentions A and B.
4. Verify that both A and B link back to the synthesis page.

**Acceptance Criteria:**
- [ ] Entity pages have bidirectional links after ingestion.
- [ ] Entity pages link back to synthesis pages after writeback.
- [ ] WikiViewer navigation follows bidirectional links correctly.

---

## Task 4.7: Test Semantic Lint on Demo Data

Run lint on `kb-business-registry` and `kb-sanctions`:

1. Verify that lint detects at least one contradiction or stale claim (the demo data has overlapping entities with slightly different details).
2. Verify that lint suggests creating concept pages for domain terms mentioned in multiple entity pages.
3. Verify that lint reports are logged to `log.md`.

**Acceptance Criteria:**
- [ ] Lint finds at least one semantic issue in demo data.
- [ ] Lint suggestions are specific and actionable.
- [ ] Lint results are logged.

---

## Sprint 4 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] `npm run build` completes without errors.
- [ ] Semantic lint detects contradictions and stale claims.
- [ ] Bidirectional links are maintained after ingestion and writeback.
- [ ] WikiManager displays lint with severity colors.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 5.**

**Do not proceed to Sprint 5 until all acceptance criteria have been met.**
