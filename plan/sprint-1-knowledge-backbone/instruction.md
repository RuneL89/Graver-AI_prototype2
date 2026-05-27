# Sprint 1: Knowledge Backbone (Group 2)

**Goal:** Build the Karpathy Knowledge Backbone layer. All wiki creation and maintenance happens here, performed by the coding agent, not the UI.

**DO NOT proceed to Sprint 2 until ALL acceptance criteria below are met.**

---

## Task 1.1: Raw Source Vault with PDF Support

Implement the Raw Source Vault (FR-201) for all knowledge bases.

- Each knowledge base has a `/data/kb-{name}/raw/` directory.
- Support markdown, plain text, CSV, JSON, and PDF files.
- For PDFs, integrate a text extraction library (e.g., `pdf-parse` for Node.js, `PyPDF2` or `pdfplumber` for Python). Extracted text is stored alongside the original PDF or used directly during Ingest.
- Raw files are immutable. No runtime code modifies them.

**FRD Reference:** FR-201 (Raw Source Vault), Section 4.1

**Acceptance Criteria:**
- [ ] A PDF dropped into `/data/kb-demo/raw/` is parsed and its text is extractable.
- [ ] Attempting to write to the raw directory at runtime throws an error.

---

## Task 1.2: Compiled Wiki Layer Structure

Implement the directory structure and file templates for the Compiled Wiki Layer (FR-202).

For every knowledge base, the wiki directory must contain:
- `index.md` — content catalog
- `log.md` — chronological record
- `/entities/` — entity pages
- `/concepts/` — concept pages
- `/synthesis/` — generated analysis pages

Create a `WikiPage` class or module that enforces:
- YAML frontmatter on every page.
- `[[wikilink]]` syntax for cross-references.
- Append-only behavior for `log.md`.

**FRD Reference:** FR-202 (Compiled Wiki Layer), Section 4.1, Section 4.3 (Entity Page Schema), Section 4.4 (index.md Schema)

**Acceptance Criteria:**
- [ ] The directory structure matches the FRD Section 4.1 exactly.
- [ ] Creating a new entity page auto-generates correct frontmatter.
- [ ] `index.md` can be parsed to return a list of all pages with summaries.

---

## Task 1.3: Per-Knowledge-Base Schema Configuration

Implement the Schema Configuration (FR-203) as a markdown file per knowledge base: `/data/kb-{name}/schema.md`.

Each schema must define:
- Page types and their directory locations.
- Ingest workflow rules per document format (text vs. PDF vs. structured data).
- Query behavior: how agents read index.md before drilling deeper.
- Citation format: how agents cite passages (e.g., `[[Entity Name]](source:raw/filename.pdf#page=3)`).
- Verification thresholds: what counts as an explicit statement vs. an inference.

Create a `SchemaLoader` utility that reads `schema.md` and returns a validated configuration object used by agents.

**FRD Reference:** FR-203 (Schema Configuration), Section 4.1

**Acceptance Criteria:**
- [ ] Every knowledge base has a `schema.md`.
- [ ] The schema loader validates required fields and throws on missing rules.
- [ ] Agents can access schema rules at runtime.

---

## Task 1.4: Wiki Lifecycle Operations (Ingest / Query / Lint)

Implement the three core operations (FR-204) as coding-agent-facing scripts or modules, not UI features.

**Ingest:**
- A script `npm run ingest --kb=kb-demo --source=raw/newfile.pdf`.
- The script reads the raw source, extracts key information, and updates the wiki.
- It updates `index.md`, relevant entity/concept pages, cross-references, and appends to `log.md`.
- One source may touch 10–15 wiki pages.

**Query:**
- A module used by agents: given a question, read `index.md`, identify relevant pages, read them, synthesize answer with citations.
- This is the primary interface between Group 3 agents and Group 2.

**Lint:**
- A script `npm run lint --kb=kb-demo`.
- Scans for contradictions, stale claims, orphan pages, missing concepts, and data gaps.
- Outputs a report suggesting fixes or new sources.

**FRD Reference:** FR-204 (Wiki Lifecycle Operations)

**Acceptance Criteria:**
- [ ] Ingest processes a new raw file and produces updated wiki pages.
- [ ] Query returns a synthesized answer with `[[wikilink]]` citations.
- [ ] Lint produces a human-readable report of issues found.
- [ ] All three operations log to `log.md`.

---

## Task 1.5: Demo Datasets

Prepare at least two demo knowledge bases with pre-loaded wiki layers for the prototype demonstration.

Suggested:
- `kb-business-registry` — simulated company and director data.
- `kb-sanctions` — simulated sanctions list entries.
- `kb-procurement` — simulated public contracts.

Each should have:
- A populated `/raw/` directory with source files (including at least one PDF per base).
- A fully compiled `/wiki/` directory with entity pages, concept pages, index.md, and log.md.
- A `schema.md` tailored to that domain.

Run Ingest and Lint on these datasets to ensure the wikis are consistent before moving to Sprint 2.

**FRD Reference:** Section 4.2 (Wiki Creation and Maintenance), Section 6.3 (Prototype Limitations), Section 7 (Use Case)

**Acceptance Criteria:**
- [ ] At least two knowledge bases exist with compiled wikis.
- [ ] Each base contains at least one PDF in `/raw/` with extracted text in the wiki.
- [ ] `kb-registry/index.md` catalogs all bases with summaries.

---

## Sprint 1 Completion Checklist

- [ ] All tasks above are implemented.
- [ ] All acceptance criteria are verified and passing.
- [ ] **Final Step: Run `/compact` before proceeding to Sprint 2.**

**Do not proceed to Sprint 2 until all acceptance criteria have been met.**
