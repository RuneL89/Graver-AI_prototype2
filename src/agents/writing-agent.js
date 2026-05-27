import { LLMClient } from '../shared/llm-client.js';

export async function draftParagraph(connectionId, swarmBundles, config) {
  if (!swarmBundles || !Array.isArray(swarmBundles) || swarmBundles.length === 0) {
    throw new Error('Writing Agent requires swarm evidence bundles. None provided.');
  }

  const client = new LLMClient(config);
  console.log(`[WritingAgent] instanceId=${client.instanceId}`);

  const ids = connectionId.split('-');
  const relevantBundles = swarmBundles.filter((b) =>
    b.entities.some((e) => {
      const key = e.name.toLowerCase().replace(/\s+/g, '-');
      return ids.some((id) => key.includes(id) || id.includes(key));
    })
  );

  const passages = relevantBundles.flatMap((b) =>
    b.passages.map((p) => `[${b.kbName}] ${p.text}`)
  );

  let paragraph;
  try {
    const prompt = `You are a writing agent for investigative journalism.\n\nConnection: ${connectionId}\n\nEvidence passages:\n${passages.join('\n\n')}\n\nWrite a single paragraph explaining this connection, citing exact sources and passages. Return ONLY the paragraph text with inline citations.`;
    paragraph = await client.sendMessage(
      'You draft note-blocks using only the provided evidence. Do not add outside knowledge.',
      prompt,
      0.3
    );
  } catch {
    paragraph = `Connection ${connectionId} is supported by the following evidence:\n\n${passages.slice(0, 3).join('\n\n')}`;
  }

  const citations = relevantBundles.flatMap((b) =>
    b.passages.map((p) => ({
      source: b.kbName,
      passage: p.text,
      wikiPage: p.sourcePage,
    }))
  );

  return { paragraph, citations };
}
