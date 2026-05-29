# Sprint Instructions — LLM Wiki Fix Plan

**Project:** AI-Assisted Investigative Journalism Prototype — LLM Wiki Architecture Retrofit  
**Version:** 1.2  
**Status:** In Progress  
**Companion Documents:**
- `FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md` — Functional Requirements Document
- `IMPLEMENTATION_PLAN_AI_Investigative_Journalism_Prototype_v1.1.md` — Original Implementation Plan
- `plan/llm-wiki-fix-plan/implementation-plan.md` — This Fix Plan's Master Document

---

## Overview

This document serves as the anchor for the sprint-based retrofit of the AI-Assisted Investigative Journalism Prototype to align with Karpathy's LLM Wiki pattern. The prototype already implements the UI, agent swarm, and storage layer (Sprints 0–5 of the original plan). This fix plan retrofits the **knowledge backbone** — the wiki data model, ingestion pipeline, schema activation, writeback loop, and semantic lint — to match the gist's architecture.

Sprints are executed in strict sequence. The next sprint will start immediately after the last one ended without any user interference.

**Rule:** Do not proceed to the next sprint until all acceptance criteria in the current sprint's `instruction.md` have been met.

**Rule:** After each sprint is completed, run `/compact` before beginning the next sprint.

**Rule:** Each sprint must preserve backward compatibility. The existing investigation flow (TipEntry → Relevance Scorer → Swarm → Connection Agent → Graph → Writing Agent → Verification → Composer) must continue to work after every sprint.

---

## Sprint Sequence

| Sprint | Folder | Instruction File | Focus | Status |
|--------|--------|------------------|-------|--------|
| Sprint 0 | `plan/llm-wiki-fix-plan/sprint-0-data-model-migration/` | [`instruction.md`](sprint-0-data-model-migration/instruction.md) | Convert index/log from JSON to markdown | ✅ Completed |
| Sprint 1 | `plan/llm-wiki-fix-plan/sprint-1-schema-as-configuration/` | [`instruction.md`](sprint-1-schema-as-configuration/instruction.md) | Inject schema into every agent prompt | ✅ Completed |
| Sprint 2 | `plan/llm-wiki-fix-plan/sprint-2-llm-driven-ingestion/` | [`instruction.md`](sprint-2-llm-driven-ingestion/instruction.md) | Replace regex ingestion with LLM pipeline | ✅ Completed |
| Sprint 3 | `plan/llm-wiki-fix-plan/sprint-3-writeback-and-compounding/` | [`instruction.md`](sprint-3-writeback-and-compounding/instruction.md) | Persist investigation answers to wiki | ✅ Completed |
| Sprint 4 | `plan/llm-wiki-fix-plan/sprint-4-rich-lint-and-links/` | [`instruction.md`](sprint-4-rich-lint-and-links/instruction.md) | Semantic lint + bidirectional links | ✅ Completed |
| Sprint 5 | `plan/llm-wiki-fix-plan/sprint-5-integration-testing-docs/` | [`instruction.md`](sprint-5-integration-testing-docs/instruction.md) | Integration testing + documentation | ✅ Completed |

---

## How to Use This Document

1. Identify the current sprint from the status table above.
2. Open the corresponding `instruction.md` file.
3. Implement all tasks and verify all acceptance criteria.
4. Mark the sprint as completed in the status table below.
5. **Run `/compact`.**
6. The next sprint begins immediately.

---

## Sprint Status Log

Use this section to record when each sprint was started and completed.

| Sprint | Started | Completed | Notes |
|--------|---------|-----------|-------|
| Sprint 0 | 2026-05-29 | 2026-05-29 | Data model migration complete |
| Sprint 1 | 2026-05-29 | 2026-05-29 | Schema injection complete |
| Sprint 2 | 2026-05-29 | 2026-05-29 | LLM-driven ingestion complete |
| Sprint 3 | 2026-05-29 | 2026-05-29 | Writeback and compounding complete |
| Sprint 4 | 2026-05-29 | 2026-05-29 | Rich lint and bidirectional links complete |
| Sprint 5 | 2026-05-29 | 2026-05-29 | Integration testing and documentation complete |

---

## Pre-Sprint 0 Baseline Verification

**Before starting Sprint 0**, verify that the existing prototype is in a known good state. The following must be true:

- [ ] `npm run build` completes without errors.
- [ ] `npm run dev` starts the development server.
- [ ] The app loads in the browser.
- [ ] Demo data can be loaded via the "Load Demo Data" button.
- [ ] Manage Wikis → View opens the WikiViewer and renders pages correctly.
- [ ] A full investigation flow (tip → graph → click edge → draft → verify → composer) works end-to-end.
- [ ] The bug fix from commit `61b4dc4` (listKnowledgeBases scanning wrong prefix) is present and working.
- [ ] The WikiViewer feature from commit `f52a590` is present and working.

If any of these are broken, fix them before starting Sprint 0.

---

## Cross-Cutting Reminders

These reminders apply to all sprints in this fix plan:

- **Client-Side Only:** No backend server, no Node.js API, no file system access outside IndexedDB. All code runs in the browser.
- **LLM Session Isolation:** Every agent that calls an LLM must instantiate its own `LLMClient`. No shared sessions. Log the `instanceId` at initialization.
- **IndexedDB Retained:** The storage engine stays IndexedDB. We store markdown *strings* instead of JSON objects. Do not introduce OPFS, localStorage, or external databases.
- **Backward Compatibility:** The existing investigation flow must work after every sprint. Do not break TipEntry, Graph, Writing Agent, Verification, or Composer.
- **Wiki Maintenance by Agents:** The UI does not write wiki pages. All wiki writes are performed by agents (`ingest.js`, `writing-agent.js`, `question-router.js`, `lint.js`) or coding-agent scripts.
- **Schema is Read-Only in UI:** The journalist can view the schema in WikiManager, but schema edits are coding-agent operations. The schema is consumed by agents as prompt context.
- **Token Cost Transparency:** Any LLM call during ingestion or lint must log estimated token usage to the console. The user should know that uploading documents now costs money.
- **Error Resilience:** LLM-driven operations (ingest, lint) must fail gracefully. Partial writes to the wiki are unacceptable. Implement rollback or atomic batching.
- **Index-First Architecture:** The Relevance Scoring Agent reads *only* `index.md` to select wikis for the swarm. The index is the single most critical document. Every entry must have a descriptive one-line summary. The Question Router also reads only indexes to route questions.
- **Writing Agent Insulation:** The Writing Agent does not read the wiki directly. It consumes only swarm evidence bundles (`page.content` strings). It is insulated from wiki storage format changes. The only changes it needs are schema injection (Sprint 1) and optional `suggestedMarkdown` return (Sprint 3).

---

**End of Sprint Instructions**
