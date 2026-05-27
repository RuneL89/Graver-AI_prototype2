# Sprint 5: README Documentation

**Goal:** Properly document the entire application in the project `README.md` so that it serves as a comprehensive reference for end users, mid-level developers, and senior developers.

**This is the final sprint. No further sprints follow.**

---

## Task 5.1: Write README.md

Replace or create the root `README.md` with a complete, well-structured document covering the following five sections exactly:

### 1. Introduction (Elevator Pitch)

A concise, end-user-friendly elevator pitch explaining what the app is. Target audience: non-technical stakeholders and journalists.

Example angle to cover:
- What problem it solves.
- Who it is for.
- What makes it unique (multi-agent, auditable, wiki-backed).

### 2. End-User Friendly Functional Architecture

A high-level description of the functional architecture written for end users (journalists and editors). Explain the three functional groupings and how they work together without deep technical jargon.

Reference the FRD Section 2 (System Overview) and Section 3 (Functional Requirements by Grouping).

### 3. Step-by-Step Architecture Description of App Flow

A detailed but accessible walkthrough of the application flow, written for a mid-level developer. This section must explain:

- The different agent flows and orchestration.
- The rejection loop and rejection criteria.
- How data moves from tip entry through the swarm to the composer.
- How the verification gate works before a note-block is accepted.

This should be enough for a mid-level developer to understand the system behavior by reading this section alone.

**FRD Reference:** Section 7 (Use Case: End-to-End Investigation), FR-301 through FR-306

### 4. Detailed Technical Architecture

A comprehensive technical architecture section written for a senior developer. This must be sufficient for a senior developer to fully understand the entirety of the app by only reading this segment. Cover:

- Exact tech stack and dependencies.
- Directory structure and module responsibilities.
- API contract details (request/response shapes).
- Agent instantiation and LLM session isolation mechanism.
- How the wiki layer is queried (not modified) at runtime.
- State management architecture.
- Error handling and logging strategy.
- Security considerations (HTTPS validation, no persistent DB, immutable raw vault).

**FRD Reference:** Section 4 (Data and Knowledge Model), Section 6 (Non-Functional Requirements), Cross-Cutting Concerns from Implementation Plan

### 5. Project Structure

A complete listing of all folders and files with a one-line description for each. Use a tree view followed by a description table or inline comments.

**FRD Reference:** Section 4.1 (Knowledge Base Structure)

---

## Task 5.2: Verify README Completeness

Before marking this sprint complete, verify that:

- [ ] Section 1 is readable by a non-technical journalist.
- [ ] Section 2 explains the three groups without code.
- [ ] Section 3 explains agent flow, orchestration, and the rejection loop clearly enough for a mid-level developer.
- [ ] Section 4 contains enough detail for a senior developer to understand the full stack and data flow.
- [ ] Section 5 lists every significant folder and file with a description.
- [ ] The README references the FRD document where appropriate.
- [ ] The README includes setup instructions (`npm install && npm run dev`).
- [ ] The README includes a note that the app is a prototype with the limitations listed in FRD Section 6.3.

---

## Sprint 5 Completion Checklist

- [ ] README.md is complete with all five sections.
- [ ] All verification items above are checked.
- [ ] **Final Step: Run `/compact`.**

**This is the final sprint. After completion, the prototype implementation is finished.**
