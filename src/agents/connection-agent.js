import { LLMClient } from '../shared/llm-client.js';

export async function buildGraph(bundles, config) {
  const client = new LLMClient(config);
  console.log(`[ConnectionAgent] instanceId=${client.instanceId}`);

  const nodes = new Map();
  const edges = [];
  const aliases = [];

  for (const bundle of bundles) {
    for (const ent of bundle.entities) {
      const key = ent.name.toLowerCase().replace(/\s+/g, '-');
      if (!nodes.has(key)) {
        nodes.set(key, {
          id: key,
          label: ent.name,
          type: ent.type || 'unknown',
          sources: [],
        });
      }
      const node = nodes.get(key);
      if (!node.sources.includes(bundle.kbName)) {
        node.sources.push(bundle.kbName);
      }
    }
  }

  const nodeList = Array.from(nodes.values());
  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const a = nodeList[i];
      const b = nodeList[j];
      const sharedSources = a.sources.filter((s) => b.sources.includes(s));
      if (sharedSources.length > 0 && a.id !== b.id) {
        edges.push({
          source: a.id,
          target: b.id,
          label: 'co-occurs',
          provenance: sharedSources,
        });
      }
    }
  }

  try {
    const prompt = `Given these entities from multiple knowledge bases:\n${nodeList
      .map((n) => `- ${n.label} (${n.sources.join(', ')})`)
      .join('\n')}\n\nReturn ONLY a JSON array of possible alias matches:\n[\n  { "names": ["Name A", "Name B"], "reason": "..." }\n]`;
    const raw = await client.sendMessage(
      'You detect alias matches across sources. Return only JSON.',
      prompt,
      0.2
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      for (const a of parsed) {
        aliases.push(a);
      }
    }
  } catch {
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const a = nodeList[i];
        const b = nodeList[j];
        if (a.label.toLowerCase().includes(b.label.toLowerCase()) || b.label.toLowerCase().includes(a.label.toLowerCase())) {
          if (a.id !== b.id) {
            aliases.push({ names: [a.label, b.label], reason: 'Substring match' });
          }
        }
      }
    }
  }

  return { nodes: nodeList, edges, aliases };
}
