import { LLMClient } from '../shared/llm-client.js';
import fs from 'fs/promises';
import path from 'path';

export async function relevanceScore(tip, kbList, config) {
  const client = new LLMClient(config);
  console.log(`[RelevanceScorer] instanceId=${client.instanceId}`);

  const scores = [];
  const tipWords = tip.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

  for (const kb of kbList) {
    const indexPath = path.resolve('data', kb, 'wiki', 'index.md');
    let indexContent = '';
    try {
      indexContent = await fs.readFile(indexPath, 'utf-8');
    } catch {
      indexContent = '';
    }

    let result;
    try {
      const prompt = `You are a relevance scoring agent.\n\nTip: "${tip}"\n\nKnowledge Base: ${kb}\nIndex Content:\n${indexContent}\n\nReturn ONLY a JSON object with this exact shape:\n{\n  "score": 0.0 to 1.0,\n  "justification": "one sentence"\n}\n`;
      const raw = await client.sendMessage(
        'You score investigative tips against knowledge bases. Return only JSON.',
        prompt,
        0.2
      );
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0.5, justification: 'Fallback' };
    } catch {
      // Fallback heuristic: keyword overlap
      const contentWords = indexContent.toLowerCase().split(/\W+/);
      const matches = tipWords.filter((w) => contentWords.includes(w)).length;
      const score = Math.min(0.3 + matches * 0.15, 0.95);
      result = {
        score,
        justification: `Keyword overlap heuristic (${matches} matches)`,
      };
    }

    scores.push({
      kbName: kb,
      score: result.score ?? 0.5,
      justification: result.justification ?? '',
      activated: (result.score ?? 0.5) >= 0.6,
    });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}
