# Schema: kb-sanctions

## Page Types

| Type | Directory | Description |
|------|-----------|-------------|
| entity | `/wiki/entities/` | Sanctioned individuals and entities |
| concept | `/wiki/concepts/` | Sanction types, legal frameworks |
| source | `/wiki/sources/` | Summaries of sanctions lists |
| synthesis | `/wiki/synthesis/` | Cross-list analysis |

## Ingest Rules

- **PDF:** Parse with `pdf-parse`; extract sanctioned entity blocks.
- **Structured:** Map fields like name, type, date, reason.

## Query Behavior

1. Read `index.md` for sanctioned names.
2. Read entity pages for aliases and related entities.
3. Cite exact reason and date from source.

## Citation Format

```
[[Entity Name]](source:raw/sanctions_list_march_2026.pdf)
```

## Verification Thresholds

- **Explicit:** Name and sanction reason appear in official list.
- **Inference:** Alias match without explicit sanction reference — flag.
- **Out of context:** Old sanction date presented as current — flag.
