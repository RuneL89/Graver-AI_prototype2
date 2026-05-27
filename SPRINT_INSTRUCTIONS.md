# Sprint Instructions

**Project:** AI-Assisted Investigative Journalism Prototype  
**Version:** 1.1  
**Status:** In Progress  
**Companion Documents:**
- `FRD_AI_Investigative_Journalism_Prototype_v1.1_APPROVED.md` — Functional Requirements Document
- `IMPLEMENTATION_PLAN_AI_Investigative_Journalism_Prototype_v1.1.md` — Full Implementation Plan

---

## Overview

This document serves as the anchor for the sprint-based implementation of the AI-Assisted Investigative Journalism Prototype. Sprints are executed in strict sequence. The next sprint will start immediately after the last one ended without any user interference.

**Rule:** Do not proceed to the next sprint until all acceptance criteria in the current sprint's `instruction.md` have been met.

**Rule:** After each sprint is completed, run `/compact` before beginning the next sprint.

---

## Sprint Sequence

| Sprint | Folder | Instruction File | Status |
|--------|--------|------------------|--------|
| Sprint 0 | `plan/sprint-0-prerequisites/` | [`instruction.md`](plan/sprint-0-prerequisites/instruction.md) | 🔲 Not Started |
| Sprint 1 | `plan/sprint-1-knowledge-backbone/` | [`instruction.md`](plan/sprint-1-knowledge-backbone/instruction.md) | 🔲 Not Started |
| Sprint 2 | `plan/sprint-2-agent-orchestration/` | [`instruction.md`](plan/sprint-2-agent-orchestration/instruction.md) | 🔲 Not Started |
| Sprint 3 | `plan/sprint-3-journalist-ui/` | [`instruction.md`](plan/sprint-3-journalist-ui/instruction.md) | 🔲 Not Started |
| Sprint 4 | `plan/sprint-4-integration/` | [`instruction.md`](plan/sprint-4-integration/instruction.md) | 🔲 Not Started |
| Sprint 5 | `plan/sprint-5-readme-documentation/` | [`instruction.md`](plan/sprint-5-readme-documentation/instruction.md) | 🔲 Not Started |

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
| Sprint 0 | — | — | — |
| Sprint 1 | — | — | — |
| Sprint 2 | — | — | — |
| Sprint 3 | — | — | — |
| Sprint 4 | — | — | — |
| Sprint 5 | — | — | — |

---

## Pre-Sprint 1 Scaffold Requirement

**Before starting Sprint 1**, the following minimal empty scaffold files must exist so that all file path references in the code resolve correctly during development. These are structural placeholders only. No actual investigative data is needed at this stage.

- `data/kb-registry/index.md` — Empty kb-registry index markdown file with just a level one heading.
- `data/kb-demo/schema.md` — Demo knowledge base schema markdown file with the minimum required fields per FR-203.
- `data/kb-demo/raw/` — Empty demo raw directory.
- `data/kb-demo/wiki/index.md` — Demo wiki index markdown file with just a level one heading.
- `data/kb-demo/wiki/log.md` — Demo wiki log markdown file that is completely empty.

**Do not create any populated entity pages, concept pages, or source summaries yet.** The actual wiki content will be added after the code is fully implemented.

---

## Cross-Cutting Reminders

- **LLM Session Isolation:** Verify throughout all sprints that no two agents share an LLM session. Log the `LLMClient` instance ID or a UUID at agent initialization.
- **Swarm-Only Data Constraint:** Enforce at the code level that the Writing Agent and Note-Block Composer cannot access data outside the swarm evidence bundles.
- **Wiki Maintenance by Coding Agent:** Never implement UI features that create, edit, or lint wiki pages. All wiki lifecycle operations (FR-204) are coding-agent scripts. The UI is read-only against the compiled wiki layer.
- **PDF Support:** Ensure the Raw Source Vault (FR-201) and Ingest script handle PDFs. If a PDF fails to parse, the error is logged and the file is skipped, but the vault remains immutable.

---

**End of Sprint Instructions**
