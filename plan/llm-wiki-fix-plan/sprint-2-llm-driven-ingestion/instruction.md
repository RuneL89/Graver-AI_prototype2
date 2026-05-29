# Sprint 2: LLM-Driven Ingestion

**Goal:** Replace the regex-based `ingestDocument` with an LLM-driven pipeline that reads the raw source, existing wiki pages, and schema; then produces updated entity pages, concept pages, source summaries, index updates, and log entries. Add progress tracking, config validation, error handling, and transactional safety to the upload flow.

**DO NOT proceed to Sprint 3 until ALL acceptance criteria below are met.**

---

## Task 2.1: Add LLM Config Validation to DocumentUploader

In `src/ui/components/DocumentUploader.jsx`, block uploads if the LLM is not configured.

**Current behavior:**
- User can upload files without any API configuration.
- `ingestDocument` runs regex heuristics offline.

**New behavior:**
- Before calling `ingestDocument`, check `state.config.apiBaseUrl` and `state.config.modelName`.
- If missing, show: "Please configure LLM API in Settings before uploading documents."
- If present but invalid (not HTTPS), show: "LLM API URL must be a valid HTTPS endpoint."

**Acceptance Criteria:**
- [ ] Uploading without config shows a clear error message.
- [ ] Uploading with invalid URL shows a clear error message.
- [ ] Uploading with valid config proceeds normally.

---

## Task 2.2: Add Ingestion Progress State to Store

In `src/ui/store.jsx`, add ingestion status tracking:

```js
const initialState = {
  // ... existing fields
  ingestion: {
    status: 'idle', // idle | extracting | analyzing | writing | done | error
    fileName: null,
    error: null,
    kbName: null,
  },
};
```

Add reducer actions:
- `INGEST_START` — sets status to 'extracting', fileName, kbName
- `INGEST_PROGRESS` — sets status to 'analyzing' or 'writing'
- `INGEST_COMPLETE` — sets status to 'done'
- `INGEST_ERROR` — sets status to 'error', captures error message

**Acceptance Criteria:**
- [ ] Store has `ingestion` state with status, fileName, error, kbName.
- [ ] Actions exist for start, progress, complete, error.
- [ ] DocumentUploader reads `ingestion` state and displays status.

---

## Task 2.3: Design the LLM Ingest Prompt

Design the prompt that will be sent to the LLM during ingestion. The prompt must:

1. Include the schema (via `buildAgentSystemPrompt` from Sprint 1).
2. Include the current `index.md` markdown.
3. Include a summary of existing entity/concept pages (titles only, to save tokens).
4. Include the raw source text (or a chunked portion).
5. Request structured JSON output.

**Critical for the Index-First Architecture:** The Relevance Scoring Agent reads *only* the `index.md` to decide which wikis are relevant to a journalist's tip. Therefore, every entry in the index must have a **descriptive one-line summary**. An index entry like `[[Jens Hansen]] — Director of Oceanic Logistics Ltd and NorthStar Procurement Inc` gives the scorer far more signal than `[[Jens Hansen]]` alone.

**Prompt Template:**
```
## Knowledge Base Schema
{schema}

## Current Wiki Index
{indexMd}

## Existing Entities
{existingEntityTitles.join(', ')}

## New Source
Filename: {filename}
Format: {ext}
Text:
{rawText}

Please process this source and integrate it into the wiki. Return ONLY a JSON object with this exact shape:
{
  "sourcePage": {
    "title": "string",
    "content": "markdown string with YAML frontmatter"
  },
  "entityPages": [
    { "title": "string", "content": "markdown string with YAML frontmatter" }
  ],
  "conceptPages": [
    { "title": "string", "content": "markdown string with YAML frontmatter" }
  ],
  "updatedIndex": "full markdown string of the updated index.md",
  "logEntry": "one-line description for the log"
}

Rules:
- Update existing entity pages if the source adds new information.
- Create new entity pages for entities not already in the wiki.
- Update the Connections section with bidirectional [[wikilink]] references.
- Note contradictions in the Contradictions section if the source conflicts with existing wiki content.
- The sourcePage should be a genuine summary, not a raw text dump.
- Do not exceed 10 entityPages per ingest to control token cost.
- CRITICAL: Every entry in updatedIndex must have a descriptive one-line summary 
  after the em-dash. The Relevance Scoring Agent reads only the index to decide 
  which wikis are relevant to a journalist's tip. Vague or missing summaries 
  directly degrade the accuracy of relevance scoring.
```

**Acceptance Criteria:**
- [ ] The prompt template exists as a constant in `src/lib/ingest.js`.
- [ ] It includes schema, index, existing entities, and source text.
- [ ] It requests structured JSON with all required fields.
- [ ] **It explicitly instructs the LLM to write descriptive one-line summaries for every index entry.**

---

## Task 2.4: Implement Chunking for Large Documents

Documents larger than ~50,000 characters may exceed the LLM context window. Implement a chunking strategy:

```js
function chunkText(text, chunkSize = 20000, overlap = 2000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
```

**Ingestion Strategy for Large Documents:**
1. Extract full text from source.
2. If text length <= 30,000 chars: process in a single LLM call.
3. If text length > 30,000 chars:
   a. Split into chunks.
   b. Process chunk 1 with LLM (initial pages created).
   c. Process chunk 2 with LLM, passing the output from chunk 1 as context (updates existing pages).
   d. Continue until all chunks processed.
   e. Final reconciliation pass: ask LLM to consolidate all chunk outputs into a single consistent set.

**Token Cost Logging:**
Log to console before each LLM call:
```
[Ingest] Calling LLM for kb-{name} / {filename}
[Ingest] Prompt length: {prompt.length} chars (~{prompt.length / 4} tokens estimated)
[Ingest] Chunk {n} of {total}
```

**Acceptance Criteria:**
- [ ] Documents <= 30,000 chars are processed in one LLM call.
- [ ] Documents > 30,000 chars are split into chunks.
- [ ] Each chunk is processed sequentially (not in parallel, to avoid write conflicts).
- [ ] Token estimates are logged to console.

---

## Task 2.5: Implement Transactional Batch Writing

Create a helper in `src/lib/wikiStore.js`:

```js
export async function batchWriteWikiPages(kbName, operations) {
  // operations = [
  //   { type: 'page', pageType: 'entity', title: '...', content: '...', frontmatter: {} },
  //   { type: 'index', markdown: '...' },
  //   { type: 'log', entry: '...' }
  // ]
  
  // Validate all operations first
  for (const op of operations) {
    if (op.type === 'page' && (!op.title || op.title.includes(':'))) {
      throw new Error(`Invalid page title: ${op.title}`);
    }
  }
  
  // Write all operations
  for (const op of operations) {
    if (op.type === 'page') {
      await saveWikiPage(kbName, op.pageType, op.title, op.content, op.frontmatter);
    } else if (op.type === 'index') {
      await updateWikiIndex(kbName, op.markdown);
    } else if (op.type === 'log') {
      await appendWikiLog(kbName, op.entry);
    }
  }
}
```

**Note:** IndexedDB does not support true cross-key transactions in this simple implementation. The best we can do is validate everything before writing, and if any write fails, attempt to roll back by storing the previous state. For the prototype, validation-before-write is sufficient. Document this limitation.

**Acceptance Criteria:**
- [ ] `batchWriteWikiPages` validates all operations before writing.
- [ ] Invalid titles throw before any writes occur.
- [ ] The function is used by `ingestDocument` for all writes.

---

## Task 2.6: Rewrite `ingestDocument`

Replace the current `ingestDocument` in `src/lib/ingest.js` with the LLM-driven pipeline.

**New Flow:**
```js
export async function ingestDocument(kbName, file, config) {
  // 1. Extract text
  await storeRawSource(kbName, file.name, file);
  const source = await getRawSource(kbName, file.name);
  const rawText = source?.text || '';
  
  // 2. Read context
  const schema = await getSchema(kbName);
  const indexMd = await readWikiIndex(kbName);
  const entityTitles = await listWikiPages(kbName, 'entity');
  
  // 3. Build prompt
  const client = new LLMClient(config);
  const systemPrompt = await buildAgentSystemPrompt(kbName,
    'You are a wiki maintainer. Process sources and return structured JSON.'
  );
  const userPrompt = buildIngestPrompt({ schema, indexMd, entityTitles, filename: file.name, ext: source?.ext, rawText });
  
  // 4. Call LLM (with chunking if needed)
  const result = await callIngestLLM(client, systemPrompt, userPrompt, rawText);
  
  // 5. Parse result
  const parsed = JSON.parse(result);
  
  // 6. Build operations
  const operations = [
    { type: 'page', pageType: 'source', title: parsed.sourcePage.title, content: parsed.sourcePage.content, frontmatter: extractFrontmatter(parsed.sourcePage.content) },
    ...parsed.entityPages.map((p) => ({ type: 'page', pageType: 'entity', title: p.title, content: p.content, frontmatter: extractFrontmatter(p.content) })),
    ...parsed.conceptPages.map((p) => ({ type: 'page', pageType: 'concept', title: p.title, content: p.content, frontmatter: extractFrontmatter(p.content) })),
    { type: 'index', markdown: parsed.updatedIndex },
    { type: 'log', entry: `ingest | ${file.name} — ${parsed.logEntry}` },
  ];
  
  // 7. Write transactionally
  await batchWriteWikiPages(kbName, operations);
  
  // 8. Refresh store
  dispatch({ type: 'INGEST_COMPLETE' });
}
```

**Error Handling:**
- If `JSON.parse` fails: log the raw response, show error in UI, do not write anything.
- If LLM call fails (network, rate limit, timeout): retry up to 2 times with 3-second delay.
- If any write fails after validation: log error, alert user, leave wiki in previous state.

**Acceptance Criteria:**
- [ ] `ingestDocument` calls the LLM to process the source.
- [ ] It produces a source summary page with actual summarization.
- [ ] It produces entity pages with meaningful content (not boilerplate).
- [ ] It updates `index.md` with new entries.
- [ ] It appends to `log.md`.
- [ ] Invalid LLM responses do not corrupt the wiki.
- [ ] Network errors trigger retries.

---

## Task 2.7: Update DocumentUploader UI

Update `src/ui/components/DocumentUploader.jsx` to show ingestion progress:

1. Before upload: check config, show error if missing.
2. During extraction: show "Extracting text from {filename}…"
3. During LLM call: show "Analyzing with LLM… (chunk {n} of {total})"
4. During writing: show "Updating wiki pages…"
5. On success: show "Ingest complete. Added {N} entities, {M} concepts."
6. On error: show error message with retry option.

Disable the upload zone while ingestion is in progress.

**Acceptance Criteria:**
- [ ] Progress messages are displayed during each phase.
- [ ] Upload zone is disabled during ingestion.
- [ ] Success message shows counts of added/updated pages.
- [ ] Error messages are descriptive and include the raw LLM response if parsing failed.

---

## Task 2.8: Test with Real Documents

Test the new ingestion pipeline with:
1. A small text file (< 5KB)
2. A medium text file (~50KB)
3. A PDF file (if available in demo data)

For each:
- Verify the source page is a summary, not a raw text dump.
- Verify entity pages contain extracted facts.
- Verify index.md is updated.
- Verify log.md is updated.
- Verify WikiViewer shows the new pages.

**Acceptance Criteria:**
- [ ] Small file ingests in < 15 seconds.
- [ ] Medium file ingests in < 60 seconds.
- [ ] PDF file extracts text and ingests correctly.
- [ ] All new pages appear in WikiViewer.

---

## Sprint 2 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] `npm run build` completes without errors.
- [ ] Upload without LLM config is blocked with clear message.
- [ ] Upload with valid config produces rich wiki pages via LLM.
- [ ] Large documents are chunked correctly.
- [ ] Failed ingests do not corrupt the wiki.
- [ ] **After upload, the Relevance Scoring Agent (reading only the updated index) can correctly identify this wiki as relevant for a tip related to the uploaded document's subject.**
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 3.**

**Do not proceed to Sprint 3 until all acceptance criteria have been met.**
