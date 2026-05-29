import { LLMClient } from '../shared/llm-client.js';
import { buildAgentSystemPrompt } from '../shared/schema-loader.js';
import { readWikiIndex, loadWikiPage, listWikiPages, appendWikiLog, getSchema } from '../lib/wikiStore.js';
import { parseIndex } from '../knowledge/wiki-page.js';

const LINT_PROMPT_TEMPLATE = `## Wiki Index
{indexMd}

## Recent Log
{logMd}

## Pages to Review
{samplePages}

You are a wiki health checker. Analyze the wiki above and return ONLY a JSON object:
{{
  "contradictions": [
    {{
      "pages": ["Page A", "Page B"],
      "claimA": "exact conflicting claim from Page A",
      "claimB": "exact conflicting claim from Page B",
      "severity": "high | medium | low",
      "suggestedResolution": "description"
    }}
  ],
  "staleClaims": [
    {{
      "page": "Page Title",
      "claim": "claim that may be outdated",
      "newerSource": "source that supersedes it",
      "severity": "high | medium | low"
    }}
  ],
  "orphans": [
    {{
      "page": "Page Title",
      "reason": "not in index | no inbound links"
    }}
  ],
  "missingConcepts": [
    {{
      "concept": "Concept Name",
      "mentionedIn": ["Page A", "Page B"],
      "suggestedDefinition": "brief description"
    }}
  ],
  "dataGaps": [
    {{
      "entity": "Entity Name",
      "missingField": "e.g. date of birth, registration number",
      "suggestedSource": "where to find this info"
    }}
  ],
  "brokenLinks": [
    {{
      "page": "Page containing dead link",
      "deadLink": "Missing Page Title"
    }}
  ],
  "suggestions": [
    {{
      "action": "update | create | delete | merge",
      "targetPage": "Page Title",
      "details": "what to do"
    }}
  ]
}}

Rules:
- A contradiction requires two explicit conflicting statements, not just missing information.
- A stale claim requires a newer source in the log that contradicts an older page.
- An orphan is a page not linked from any other page AND not in the index.
- A missing concept is a term mentioned in 2+ pages that lacks its own concept page.
- A data gap is an entity page missing a field that the schema says is required.
`;

export async function runSemanticLint(kbName, config) {
  const client = new LLMClient(config);
  console.log(`[LintAgent] instanceId=${client.instanceId}`);

  const indexMd = await readWikiIndex(kbName);
  const index = parseIndex(indexMd);

  // Collect sample pages: all entities, plus up to 3 concepts, sources, synthesis
  const samplePages = [];
  for (const sub of ['entity', 'concept', 'source', 'synthesis']) {
    const titles = await listWikiPages(kbName, sub);
    const limit = sub === 'entity' ? Infinity : 3;
    for (const title of titles.slice(0, limit)) {
      const page = await loadWikiPage(kbName, sub, title);
      if (page) {
        samplePages.push({ title: `${sub}/${title}`, content: page.content || '' });
      }
    }
  }

  // Read log
  const logMd = (await getSchema(kbName, 'log')) || ''; // log is not in getSchema... need to read log directly
  // Actually, there's no readWikiLog function. Let me read from db directly.
  const logEntry = await import('../lib/db.js').then((m) => m.dbGet(`wiki.${kbName}.log`, 'entries'));
  const logMdStr = logEntry || `# Log: ${kbName}\n`;

  const sampleText = samplePages.map((p) => `--- ${p.title} ---\n${p.content.slice(0, 2000)}`).join('\n\n');

  const systemPrompt = await buildAgentSystemPrompt(
    kbName,
    'You are a wiki health checker. Return only JSON.'
  );
  const userPrompt = LINT_PROMPT_TEMPLATE
    .replace('{indexMd}', indexMd)
    .replace('{logMd}', logMdStr.split('\n').slice(-20).join('\n'))
    .replace('{samplePages}', sampleText);

  console.log(`[LintAgent] Prompt length: ${userPrompt.length} chars (~${Math.round(userPrompt.length / 4)} tokens estimated)`);

  const raw = await client.sendMessage(systemPrompt, userPrompt, 0.2);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM response did not contain JSON object');
  return JSON.parse(jsonMatch[0]);
}

export function buildLintReport(kbName, result) {
  const lines = [];
  lines.push(`Lint Report for ${kbName}`);
  lines.push(`Contradictions: ${result.contradictions?.length || 0}`);
  lines.push(`Stale Claims: ${result.staleClaims?.length || 0}`);
  lines.push(`Orphans: ${result.orphans?.length || 0}`);
  lines.push(`Missing Concepts: ${result.missingConcepts?.length || 0}`);
  lines.push(`Data Gaps: ${result.dataGaps?.length || 0}`);
  lines.push(`Broken Links: ${result.brokenLinks?.length || 0}`);
  lines.push(`Suggestions: ${result.suggestions?.length || 0}`);

  if (result.suggestions?.length > 0) {
    lines.push('\nTop Suggestions:');
    for (const s of result.suggestions.slice(0, 5)) {
      lines.push(`- [${s.action}] ${s.targetPage}: ${s.details}`);
    }
  }

  return {
    summary: `${result.contradictions?.length || 0} contradictions, ${result.staleClaims?.length || 0} stale, ${result.suggestions?.length || 0} suggestions`,
    text: lines.join('\n'),
    structured: result,
  };
}
