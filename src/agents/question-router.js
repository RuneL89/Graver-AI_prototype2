import { LLMClient } from '../shared/llm-client.js';
import fs from 'fs/promises';
import path from 'path';
import { runSwarm } from './swarm-orchestrator.js';

export async function routeQuestion(question, sessionContext, config) {
  const client = new LLMClient(config);
  console.log(`[QuestionRouter] instanceId=${client.instanceId}`);

  const activeBases = sessionContext?.activeBases || [];
  const indexes = [];
  for (const kb of activeBases) {
    const indexPath = path.resolve('data', kb, 'wiki', 'index.md');
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      indexes.push({ kb, content });
    } catch {
      // skip
    }
  }

  let targetBases = activeBases;
  try {
    const prompt = `You are a question router.\n\nQuestion: "${question}"\n\nPrevious questions: ${(sessionContext?.history || []).join(', ')}\n\nKnowledge base indexes:\n${indexes.map((i) => `--- ${i.kb} ---\n${i.content}`).join('\n')}\n\nReturn ONLY a JSON array of bases to query:\n["kb-name", ...]`;
    const raw = await client.sendMessage(
      'You route clarifying questions to the correct knowledge bases. Return only JSON.',
      prompt,
      0.2
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      targetBases = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // fallback to all active bases
  }

  const activated = targetBases.map((kb) => ({ kbName: kb, activated: true }));
  const bundles = await runSwarm(question, activated, config);
  const { buildGraph } = await import('./connection-agent.js');
  const graph = await buildGraph(bundles, config);

  return {
    question,
    targetBases,
    bundles,
    graph,
    history: [...(sessionContext?.history || []), question],
  };
}
