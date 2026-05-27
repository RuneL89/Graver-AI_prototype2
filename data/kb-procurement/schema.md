# Schema: kb-procurement

## Page Types

| Type | Directory | Description |
|------|-----------|-------------|
| entity | `/wiki/entities/` | Contracts, vendors, signatories |
| concept | `/wiki/concepts/` | Procurement types, thresholds |
| source | `/wiki/sources/` | Summaries of contract documents |
| synthesis | `/wiki/synthesis/` | Vendor performance analysis |

## Ingest Rules

- **PDF:** Parse with `pdf-parse`; extract contract blocks with ID, vendor, value, date.
- **CSV/JSON:** One contract per row/object.

## Query Behavior

1. Read `index.md` for contract IDs or vendor names.
2. Read entity pages for contract details and signatories.
3. Return value and date with exact citations.

## Citation Format

```
[[Contract ID]](source:raw/procurement_contracts_2025.pdf)
```

## Verification Thresholds

- **Explicit:** Contract value and vendor appear in source.
- **Inference:** Vendor linked to contract by address alone — flag.
- **Out of context:** Contract from wrong year used — flag.
