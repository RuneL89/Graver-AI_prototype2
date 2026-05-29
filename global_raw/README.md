# Global Raw Inbox

Drop source documents here for agent-driven wiki ingestion.

## How it works

1. Add files to this folder (PDF, TXT, MD, CSV, JSON).
2. Tell the agent to check `global_raw/`.
3. The agent will ask whether to add the file to an existing knowledge base or create a new one.
4. The agent reads the source, discusses key takeaways with you, and writes wiki pages.
5. Run `npm run bundle-demo` to regenerate the demo data JSONs.

## Rules

- Do not create subfolders here. Keep all files flat in this directory.
- The agent copies processed files to `data/kb-<name>/raw/`.
- This folder acts as an inbox — processed files are distributed to their KB folders.
