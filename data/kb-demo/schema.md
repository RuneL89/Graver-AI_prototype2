# Schema: kb-demo

## Page Types

| Type | Directory | Description |
|------|-----------|-------------|
| entity | `/wiki/entities/` | One page per discovered entity |
| concept | `/wiki/concepts/` | Domain abstractions |
| source | `/wiki/sources/` | Summaries of raw documents |
| synthesis | `/wiki/synthesis/` | Combined analysis |

## Ingest Rules

- **Text/Markdown:** Read directly; extract entities and relationships.
- **CSV/JSON:** Parse structured rows/objects; one entity per row where applicable.
- **PDF:** Parse with `pdf-parse`; extract text per page; store page references.

## Query Behavior

1. Read `index.md` to locate relevant pages.
2. Drill into entity and source pages for detail.
3. Synthesize answer with citations.

## Citation Format

```
[[Entity Name]](source:raw/filename.pdf#page=3)
```

## Verification Thresholds

- **Explicit statement:** Entity and relationship appear verbatim in source text.
- **Inference:** Relationship implied but not directly stated — must be flagged.
- **Out of context:** Passage used contradicts broader source meaning — must be flagged.
