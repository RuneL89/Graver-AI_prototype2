import { LLMClient } from '../shared/llm-client.js';
import { readWikiIndex, listWikiPages, loadWikiPage } from '../lib/wikiStore.js';
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';

export async function runSwarm(tip, activatedBases, config) {
  const promises = activatedBases.map((base) =>
    researchAgent(tip, base.kbName, config)
  );
  const bundles = await Promise.all(promises);
  return bundles;
}

async function researchAgent(tip, kbName, config) {
  const client = new LLMClient(config);
  console.log(`[ResearchAgent:${kbName}] instanceId=${client.instanceId}`);

  const tipWords = tip.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

  const indexContent = await readWikiIndex(kbName);

  const entityNames = await listWikiPages(kbName, 'entity');
  const passages = [];
  const entities = [];

  for (const name of entityNames) {
    const page = await loadWikiPage(kbName, 'entity', name);
    if (!page) continue;
    const content = page.content || '';
    const contentLower = content.toLowerCase();
    const matches = tipWords.filter((w) => contentLower.includes(w)).length;

    entities.push({ name, type: inferType(name), wikiPage: `entities/${name}.md` });

    if (matches > 0) {
      passages.push({
        text: content.slice(0, 1000),
        sourcePage: `entities/${name}.md`,
        entityRefs: [name],
      });
    }
  }

  try {
    const systemPrompt = await buildAgentSystemPrompt(
      kbName,
      'You search a wiki for evidence related to an investigative tip. Return only JSON.'
    );
    const prompt = `Tip: "${tip}"\n\nKnowledge Base: ${kbName}\nIndex:\n${indexContent}\n\nEntity pages:\n${passages.map((p) => p.text.slice(0, 300)).join('\n---\n')}\n\nReturn a JSON object:\n{\n  "relevantPassages": ["..."],\n  "relevantEntities": ["..."]\n}`;
    const raw = await client.sendMessage(systemPrompt, prompt, 0.2);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.relevantPassages) {
        for (const p of parsed.relevantPassages) {
          passages.push({ text: p, sourcePage: 'synthesized', entityRefs: [] });
        }
      }
      if (parsed.relevantEntities) {
        for (const e of parsed.relevantEntities) {
          if (!entities.find((x) => x.name === e)) {
            entities.push({ name: e, type: 'unknown', wikiPage: '' });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[ResearchAgent:${kbName}] LLM error: ${err.message}, using heuristic fallback.`);
  }

  return { kbName, passages, entities };
}

function inferType(name) {
  if (name.startsWith('PC-')) return 'contract';
  if (name.includes('Ltd') || name.includes('Inc') || name.includes('Partners')) return 'company';
  return 'person';
}
