# Functional Requirements Document
# AI-Assisted Investigative Journalism Prototype

**Version:** 1.1  
**Date:** 2026-05-27  
**Status:** APPROVED

---

## 1. Purpose and Scope

### 1.1 Purpose
This document defines the functional requirements for a browser-based prototype that demonstrates an AI-assisted investigative journalism architecture. The prototype takes an investigative tip, queries multiple domain-specific knowledge bases in parallel, discovers cross-source connections, and produces a navigable evidence map with auditable note-blocks for article drafting.

### 1.2 Scope
**In Scope (Prototype):**
- Browser-based end-to-end demo with simulated or pre-loaded knowledge base datasets
- Multi-agent orchestration layer with parallel research, connection discovery, writing, and verification
- Karpathy LLM Wiki pattern as the persistent knowledge backbone (manually pre-loaded and pre-compiled for the demo)
- Interactive journalist interface: tip entry, connection graph, note-block composer, verification dashboard, clarifying question terminal, and LLM configuration
- Per-agent independent LLM sessions with configurable API endpoint and model

**Out of Scope (Production):**
- Live API connections to external registries, sanctions lists, procurement databases, or customs systems
- Automated ingest pipelines that continuously update wikis from streaming sources
- User authentication, role-based access control, or multi-tenant deployment
- Publishing workflow integration with CMS or editorial systems

### 1.3 Target User
Investigative journalists who need to trace entities across disconnected structured databases. The user is assumed to have domain expertise but no technical query syntax knowledge.

---

## 2. System Overview

The system is organized into three functional groupings:

- **Group 1: Journalist Perspective** — The browser surface where the journalist enters tips, explores evidence, assembles article drafts, and configures the LLM backend.
- **Group 2: Karpathy Knowledge Backbone** — The persistent, compounding markdown wiki layer that sits between raw sources and agent queries.
- **Group 3: Agent Orchestration** — The engine room that routes tips, spawns parallel agents, synthesizes connections, writes note-blocks, and verifies claims.

The backbone is built on Karpathy's LLM Wiki pattern: instead of stateless RAG retrieval on every query, each knowledge base is a persistent directory of LLM-maintained markdown files (entity pages, concept pages, cross-reference maps, contradiction registers, index catalogs, and chronological logs). In this prototype, these wiki structures are manually pre-loaded from curated datasets. A production system would add automated ingest pipelines to connect live APIs and registries, continuously updating the wikis as new documents arrive.

**LLM Session Architecture:** Each agent in Group 3 operates as an independent LLM session with its own context window and conversation state. The LLM API endpoint (HTTPS URL) and model name are defined globally in the Configuration Page (FR-107) and passed to each agent at initialization. No agent shares a session with another agent.

---

## 3. Functional Requirements by Grouping

### 3.1 Group 1: Journalist Perspective

#### 3.1.1 FR-101: Tip Entry Portal
- **Description:** The system shall provide a single natural-language input field for the journalist to enter an investigative tip.
- **Acceptance Criteria:**
  - The input accepts free-form text with no required query syntax.
  - Submission triggers the Relevance Scoring Agent (FR-301).
  - The input is preserved and displayed throughout the session for reference.

#### 3.1.2 FR-102: Active Knowledge Base Panel
- **Description:** The system shall display which knowledge bases were activated by the Relevance Scoring Agent, with the ability for the journalist to override selections.
- **Acceptance Criteria:**
  - The panel lists each activated base with a one-line relevance justification.
  - The journalist can deselect an activated base or manually activate an additional base.
  - Changes to the panel trigger a re-run of the Parallel Research Swarm (FR-302).

#### 3.1.3 FR-103: Connection Graph Navigator
- **Description:** The system shall render an interactive graph showing entities and their cross-source connections.
- **Acceptance Criteria:**
  - Nodes represent entities (people, companies, contracts, events).
  - Edges represent connections with provenance labels indicating which knowledge bases link them.
  - The journalist can click any node or edge to trigger the Writing Agent (FR-304).
  - The graph updates dynamically when clarifying questions yield new evidence.

#### 3.1.4 FR-104: Note-Block Composer
- **Description:** The system shall provide a working article draft area where verified note-blocks accumulate in sequence.
- **Acceptance Criteria:**
  - The composer shall only consume data originating from the Parallel Research Swarm (FR-302). It shall not access any external data sources, pre-loaded templates, or static content.
  - The composer shall remain inactive and display a waiting state until the Parallel Research Swarm has completed execution and returned evidence bundles.
  - Each accepted note-block is appended to the composer as a discrete paragraph.
  - Each block carries its full citation trail (source knowledge base, exact passage reference, and relationship type).
  - The journalist can reorder or delete blocks.
  - The composer exports the accumulated draft as markdown.

#### 3.1.5 FR-105: Verification Dashboard
- **Description:** The system shall display a side-by-side audit view of each note-block against its source passages before acceptance into the composer.
- **Acceptance Criteria:**
  - Status indicators per block: Verified, Pending Review, or Flagged.
  - For Flagged blocks, the specific reason is displayed (e.g., "inferred relationship," "passage out of context," "entity not found in source").
  - The journalist can accept a verified block into the composer or reject a flagged block.

#### 3.1.6 FR-106: Clarifying Question Terminal
- **Description:** The system shall provide a persistent chat interface for follow-up questions at any stage.
- **Acceptance Criteria:**
  - Questions are routed to the Question Router (FR-306).
  - Responses update the Connection Graph Navigator and any affected note-blocks.
  - The terminal maintains conversation history within the session.

#### 3.1.7 FR-107: Configuration Page
- **Description:** The system shall provide a dedicated configuration page accessible from the journalist interface where the LLM backend parameters are defined.
- **Acceptance Criteria:**
  - The page contains input fields for: LLM API Base URL (HTTPS endpoint), and Model Name.
  - The configuration is persisted for the browser session.
  - Each agent in Group 3 initializes its own independent LLM session using these parameters. No two agents share a session or context window.
  - Changing the configuration after agents have initialized triggers a session reset warning.
  - The configuration page is accessible via a settings icon in the main navigation.

---

### 3.2 Group 2: Karpathy Knowledge Backbone

#### 3.2.1 FR-201: Raw Source Vault
- **Description:** Each knowledge base shall maintain an immutable collection of original source documents.
- **Acceptance Criteria:**
  - Documents are read-only. No agent modifies them.
  - Documents are organized per knowledge base in a dedicated directory.
  - Supported formats for the prototype: markdown, plain text, structured CSV/JSON, and PDF.
  - PDF documents shall be parsed to extract text content prior to wiki compilation.

#### 3.2.2 FR-202: Compiled Wiki Layer
- **Description:** Each knowledge base shall maintain a persistent directory of LLM-generated markdown files that compound over time.
- **Acceptance Criteria:**
  - **Entity Pages:** One page per discovered entity, with structured frontmatter and cross-references.
  - **Concept Pages:** One page per domain abstraction, linking to all related entities.
  - **Cross-Reference Map:** Bidirectional wikilinks between all pages.
  - **Contradiction Register:** Explicitly flagged conflicts between sources, dated and sourced.
  - **index.md:** Content catalog listing every page with a one-line summary and metadata. Agents read this first to locate relevant material.
  - **log.md:** Append-only chronological record of all ingests, queries, and lint passes.

#### 3.2.3 FR-203: Schema Configuration
- **Description:** Each knowledge base shall have a schema document governing wiki structure and agent behavior.
- **Acceptance Criteria:**
  - The schema defines page types, directory conventions, and naming rules.
  - The schema defines ingest workflows per document format.
  - The schema defines query behavior, citation formats, and verification thresholds.
  - The schema is readable and editable by a human operator.

#### 3.2.4 FR-204: Wiki Lifecycle Operations
- **Description:** The system shall support three core operations on the wiki layer.
- **Acceptance Criteria:**
  - **Ingest:** A new document is read, summarized, and integrated into the wiki. Relevant entity and concept pages are updated. Cross-references are added or strengthened. The index and log are updated.
  - **Query:** An agent reads index.md to identify relevant pages, then drills into them to synthesize an answer with citations.
  - **Lint:** A scheduled or on-demand health check scans for contradictions, stale claims, orphan pages, missing concept pages, and investigation gaps.

---

### 3.3 Group 3: Agent Orchestration

#### 3.3.1 FR-301: Relevance Scoring Agent
- **Description:** The system shall score the investigative tip against each knowledge base's index catalog and return a ranked, threshold-filtered activation list.
- **Acceptance Criteria:**
  - The agent reads index.md from every knowledge base.
  - Scoring considers entity names, concept coverage, and domain overlap.
  - Only bases scoring above the threshold are passed to the Parallel Research Swarm.
  - The ranked list and justifications are surfaced in the Active KB Panel (FR-102).
  - The agent initializes its own independent LLM session using the parameters from FR-107.

#### 3.3.2 FR-302: Parallel Research Agent Swarm
- **Description:** The system shall spawn one autonomous agent per activated knowledge base, running concurrently.
- **Acceptance Criteria:**
  - Each agent operates exclusively within its assigned base's Compiled Wiki Layer.
  - Each agent searches the wiki (not raw documents) for passages and entities matching the tip.
  - Each agent returns a structured evidence bundle with exact citations and extracted entities.
  - Agents run in parallel. A slow query on one base does not block the others.
  - The swarm can be re-triggered by the Question Router (FR-306) or Active KB Panel changes (FR-102).
  - Each swarm agent initializes its own independent LLM session using the parameters from FR-107.

#### 3.3.3 FR-303: Connection Agent
- **Description:** The system shall consume all evidence bundles and construct a relationship graph of cross-source entities.
- **Acceptance Criteria:**
  - The agent identifies entities that appear across multiple knowledge bases.
  - The agent builds a graph with provenance edges showing which sources connect to which.
  - The graph structure is passed to the Connection Graph Navigator (FR-103).
  - The agent flags when the same entity is referenced by different names across sources.
  - The agent initializes its own independent LLM session using the parameters from FR-107.

#### 3.3.4 FR-304: Writing Agent
- **Description:** The system shall generate a draft paragraph on demand when the journalist clicks a connection in the graph.
- **Acceptance Criteria:**
  - The agent shall only consume data originating from the Parallel Research Swarm (FR-302). It shall not access external sources, static templates, or pre-loaded content outside the swarm evidence bundles.
  - The agent shall not execute or produce output until the Parallel Research Swarm has completed and delivered its evidence bundles.
  - The agent reads the relevant wiki pages and raw source passages for the selected connection from within the swarm data.
  - The output is a single paragraph explaining the connection.
  - The paragraph cites exact sources and passages.
  - The output is passed to the Verification Agent (FR-305) before reaching the journalist.
  - The agent initializes its own independent LLM session using the parameters from FR-107.

#### 3.3.5 FR-305: Verification Agent
- **Description:** The system shall verify every note-block before it is accepted into the composer.
- **Acceptance Criteria:**
  - The agent confirms that cited entities exist in the Raw Source Vault.
  - The agent confirms that the relationship is explicitly stated in source text, not inferred by the LLM.
  - The agent confirms that no passages were taken out of context.
  - The agent outputs: Verified, or Flagged with a specific reason.
  - Verified blocks proceed to the Verification Dashboard (FR-105). Flagged blocks are held with an explanation.
  - The agent initializes its own independent LLM session using the parameters from FR-107.

#### 3.3.6 FR-306: Question Router
- **Description:** The system shall parse clarifying questions and dispatch targeted queries to the appropriate swarm agents.
- **Acceptance Criteria:**
  - The router identifies which knowledge bases hold relevant context by reading their index catalogs.
  - The router formulates a targeted query per relevant base.
  - Returning evidence is integrated into the Connection Graph and updates affected note-blocks.
  - The router maintains context from prior questions within the session.
  - The router initializes its own independent LLM session using the parameters from FR-107.

---

## 4. Data and Knowledge Model

### 4.1 Knowledge Base Structure
Each knowledge base is a self-contained directory with the following structure:

```
/kb-{name}/
  /raw/               -- Raw Source Vault (immutable)
  /wiki/              -- Compiled Wiki Layer (LLM-maintained)
    index.md
    log.md
    /entities/
    /concepts/
    /synthesis/
  schema.md           -- Schema Configuration
```

### 4.2 Wiki Creation and Maintenance
The LLM wiki layer is created and updated by the coding agent during development and data preparation. It is not created, modified, or maintained through the journalist-facing UI. The UI only reads from the compiled wiki layer. The coding agent handles all ingest, cross-referencing, index updates, and lint operations as part of prototype setup.

### 4.3 Entity Page Schema
Each entity page shall contain:
- YAML frontmatter with: entity type, date first seen, source count, aliases
- A summary paragraph
- A connections section with wikilinks to related entities
- A sources section listing all raw documents that mention this entity
- A contradictions section if conflicting information exists

### 4.4 index.md Schema
The index shall contain:
- A categorized list of all wiki pages (entities, concepts, sources, synthesis)
- One-line summary per page
- Wikilink to each page
- Optional metadata: date, source count, status

---

## 5. Interface Requirements

### 5.1 Browser-Based
The prototype shall run entirely in a modern web browser. No installation or desktop client is required.

### 5.2 Responsive Layout
The journalist interface shall use a three-pane layout:
- **Left pane:** Tip Entry Portal, Active KB Panel, Clarifying Question Terminal
- **Center pane:** Connection Graph Navigator
- **Right pane:** Verification Dashboard above Note-Block Composer
- **Top bar:** Navigation including access to the Configuration Page (FR-107)

### 5.3 Real-Time Updates
The graph and composer shall update without a full page reload when new evidence arrives or clarifying questions are answered.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Parallel research agents shall complete within 30 seconds per knowledge base for the prototype datasets.
- The Connection Agent shall return the graph within 10 seconds of swarm completion.
- The Writing Agent shall return a draft paragraph within 5 seconds of a graph click.

### 6.2 Auditability
- Every note-block shall carry a complete citation trail that a human can trace back to the exact source passage.
- Every agent action shall be logged in the knowledge base log.md.

### 6.3 Prototype Limitations
- Knowledge bases are manually pre-loaded for the demo. Simulated datasets are acceptable.
- No persistent user accounts or session storage across browser refreshes.
- Export is limited to markdown format.

---

## 7. Use Case: End-to-End Investigation

**Actor:** Investigative journalist  
**Goal:** Trace a company through multiple databases to find cross-source connections

**Flow:**
1. Journalist opens the Configuration Page (FR-107) and enters the LLM API base URL and model name.
2. Journalist enters tip: "Company X appears in procurement contracts and may be linked to sanctioned directors."
3. Relevance Scoring Agent (FR-301, independent session) reads all knowledge base indexes. It activates the Business Registry, Procurement Database, and Sanctions List bases.
4. Active KB Panel (FR-102) displays the three activated bases with relevance justifications.
5. Parallel Research Swarm (FR-302, one independent session per agent) spawns three agents. Each searches its wiki for Company X and related directors. The swarm completes before any writing can occur.
6. Connection Agent (FR-303, independent session) receives all evidence. It discovers that Director Y links Company X in the Business Registry to a sanctioned entity in the Sanctions List, and that Contract Z in the Procurement Database involves Company X.
7. Connection Graph Navigator (FR-103) renders the graph: Company X -> Director Y -> Sanctioned Entity; Company X -> Contract Z.
8. Journalist clicks the edge between Director Y and the Sanctioned Entity.
9. Writing Agent (FR-304, independent session) drafts a paragraph using only the swarm evidence bundles. It explains the link, citing exact registry and sanctions passages.
10. Verification Agent (FR-305, independent session) checks the draft. It confirms Director Y is named in both sources and the sanctions status is explicitly stated. Status: Verified.
11. Verification Dashboard (FR-105) shows the block as verified. Journalist accepts it into the Note-Block Composer (FR-104).
12. Journalist asks a clarifying question in the terminal (FR-106): "Does Director Y have other companies?" Question Router (FR-306, independent session) dispatches to the Business Registry agent.
13. New evidence arrives. Connection Graph updates to show two additional companies linked to Director Y.

---

## 8. Glossary

| Term | Definition |
|------|------------|
| Knowledge Base | A domain-specific collection of raw sources and its compiled wiki layer |
| Note-Block | A single draft paragraph with full citation trail, generated by the Writing Agent |
| Wiki Layer | The LLM-maintained markdown directory that compounds knowledge over time |
| index.md | The content catalog that agents read first to locate relevant material |
| log.md | The chronological record of all wiki operations |
| Schema | The per-knowledge-base configuration document governing agent behavior |
| Lint | A health-check operation that scans the wiki for contradictions and gaps |
| Independent LLM Session | A dedicated API connection with its own context window and conversation state, not shared with other agents |

---

## 9. Appendices

### Appendix A: Karpathy LLM Wiki Adaptation
The knowledge backbone adapts Karpathy's LLM Wiki pattern for investigative journalism. Key adaptations:
- Multiple independent wikis (one per knowledge base) rather than a single personal wiki
- Schema per base rather than a single global schema
- Parallel swarm query across wikis rather than single-wiki query
- Connection Agent as a cross-wiki synthesis layer not present in the original pattern
- Verification Agent as a domain-specific lint pass on journalist-facing output

### Appendix B: Prototype vs. Production Knowledge Layer
**Prototype (this document):** Wikis are manually pre-loaded from curated datasets. Ingest is a one-time setup step performed by the coding agent, not the UI. Agents query pre-compiled wikis.

**Production (future scope):** Automated ingest pipelines connect to live APIs (business registries, sanctions APIs, procurement portals). Wikis are continuously updated. Lint runs on a schedule. The schema evolves with the domain.

---

**End of Document**
