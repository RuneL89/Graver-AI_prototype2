# Schema: kb-business-registry

## Page Types

| Type | Directory | Description |
|------|-----------|-------------|
| entity | `/wiki/entities/` | Companies, directors, addresses |
| concept | `/wiki/concepts/` | Domain abstractions like beneficial ownership |
| source | `/wiki/sources/` | Summaries of registry extracts |
| synthesis | `/wiki/synthesis/` | Combined analysis across sources |

## Ingest Rules

- **PDF:** Parse with `pdf-parse`; extract company blocks; one entity per company.
- **CSV/JSON:** Parse rows/objects; map columns to entity fields.
- **Text:** Extract named entities via regex or LLM.

## Query Behavior

1. Read `index.md` to find companies or directors by name.
2. Read entity pages for directorship links.
3. Return structured evidence with registry identifiers.

## Citation Format

```
[[Entity Name]](source:raw/business_registry_q1_2026.pdf)
```

## Verification Thresholds

- **Explicit:** Director name appears in company record.
- **Inference:** Directorship implied by address match only — flag.
- **Out of context:** Partial name match without registry number — flag.
