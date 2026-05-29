import { getSchema } from '../lib/wikiStore.js';

const REQUIRED_SECTIONS = ['Page Types', 'Ingest Rules', 'Query Behavior', 'Citation Format'];

export async function buildAgentSystemPrompt(kbNameOrNames, baseSystemPrompt) {
  const kbNames = Array.isArray(kbNameOrNames)
    ? [...new Set(kbNameOrNames.filter(Boolean))]
    : [kbNameOrNames].filter(Boolean);

  if (kbNames.length === 0) return baseSystemPrompt;

  let header = '';
  for (const kb of kbNames) {
    const schema = await getSchema(kb);
    if (schema) {
      header += `## Knowledge Base Schema (${kb})\n\n${schema}\n\n---\n\n`;
    }
  }

  const fullPrompt = `${header}${baseSystemPrompt}`;
  console.log(`[SchemaLoader] Prefixed system prompt (${fullPrompt.length} chars). Schema header: ${header.slice(0, 200)}...`);
  return fullPrompt;
}

export function validateSchema(schemaText) {
  const missing = REQUIRED_SECTIONS.filter((section) => !schemaText.includes(section));
  return { valid: missing.length === 0, missing };
}
