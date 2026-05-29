import { LLMClient } from '../shared/llm-client.js';
import { listRawSources, readRawSourceText } from '../lib/rawVault.js';
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';

export async function verifyBlock(paragraph, citations, config) {
  const client = new LLMClient(config);
  console.log(`[VerificationAgent] instanceId=${client.instanceId}`);

  let rawSources = '';
  for (const c of citations) {
    const kb = c.source;
    const files = await listRawSources(kb);
    for (const f of files) {
      const content = await readRawSourceText(kb, f);
      rawSources += `\n--- ${kb}/${f} ---\n${content}\n`;
    }
  }

  let allExplicit = true;
  let reason = null;

  for (const c of citations) {
    const passageLower = c.passage.toLowerCase();
    if (!rawSources.toLowerCase().includes(passageLower.slice(0, 200))) {
      allExplicit = false;
      reason = 'Cited passage not found verbatim in raw sources.';
      break;
    }
  }

  const kbNames = [...new Set(citations.map((c) => c.source))];

  try {
    const systemPrompt = await buildAgentSystemPrompt(
      kbNames,
      'You verify that note-blocks are supported by explicit evidence in raw sources. Return only JSON.'
    );
    const prompt = `Verify the following note-block against the raw sources.\n\nNote-block:\n${paragraph}\n\nCitations:\n${citations.map((c) => `- ${c.source}: ${c.passage}`).join('\n')}\n\nRaw Sources:\n${rawSources}\n\nReturn ONLY a JSON object:\n{\n  "status": "VERIFIED" | "FLAGGED",\n  "reason": "explanation or null"\n}`;
    const raw = await client.sendMessage(systemPrompt, prompt, 0.1);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'FLAGGED', reason: 'Parse error' };
    return {
      status: result.status || 'FLAGGED',
      reason: result.reason || null,
    };
  } catch {
    return {
      status: allExplicit ? 'VERIFIED' : 'FLAGGED',
      reason,
    };
  }
}
