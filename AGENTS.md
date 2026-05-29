# Karpathy-Inspired Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

# Wiki Ingestion Workflow (Agent-Driven)

This project uses an agent-driven wiki creation workflow inspired by Andrej Karpathy's LLM Wiki pattern.

## Folder Structure

```
global_raw/              -- inbox for new source documents
 data/kb-<name>/
   raw/                  -- source documents assigned to this KB
   wiki/
     entities/           -- person, company, contract pages
     concepts/           -- domain abstractions
     sources/            -- structured summaries of raw documents
     synthesis/          -- combined analysis
     index.md            -- table of contents
     log.md              -- append-only record of operations
   schema.md             -- KB-specific rules and page types
```

## Ingest Workflow

When the user adds files to `global_raw/` and asks you to process them:

1. List files in `global_raw/` and cross-reference with `data/kb-*/raw/` to find unprocessed files.
2. For each unprocessed file, ask the user whether to add it to an existing KB or create a new one.
   - If creating a new KB, ask for the KB name and what domain it covers.
   - Draft a `schema.md` for the new KB and present it for approval.
   - Create `data/kb-<name>/wiki/index.md` and `data/kb-<name>/wiki/log.md`.
3. Copy the file from `global_raw/` to `data/kb-<name>/raw/`.
4. Read the full source document.
5. Discuss key takeaways with the user before writing any wiki pages.
6. Create or update wiki pages following the page template:
   - `## Summary` — 1-2 sentences
   - `## Details` — main content with inline citations: `(source: filename)`
   - `## Related pages` — forward links
   - `## Connections` — backlinks
   - `## Sources` — list of raw sources
   - `## Contradictions` — only if applicable
7. If the source touches multiple KBs, write the primary pages in the chosen KB and add cross-reference pages or links in the secondary KBs.
8. Update `data/kb-<name>/wiki/index.md` with new pages and one-line descriptions.
9. Append an entry to `data/kb-<name>/wiki/log.md`.
10. Remind the user to run `npm run bundle-demo` to regenerate the demo data JSONs.

## Page Format Rules

- A single rich source may generate 10-20 pages (entities + concepts combined).
- Create concept pages for EVERY major idea, domain term, or pattern mentioned.
- Every factual claim must cite its source inline.
- Use [[wiki-links]] liberally to connect related pages.
- Keep page names lowercase with hyphens (e.g., `machine-learning.md`).
- Write in clear, plain language.

## Citation Rules

- Every factual claim should reference its source file: `(source: filename.pdf)`
- If two sources disagree, note the contradiction explicitly.
- If a claim has no source, mark it as needing verification.
