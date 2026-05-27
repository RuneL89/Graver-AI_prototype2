import { relevanceScore } from '../src/agents/relevance-scorer.js';
import { runSwarm } from '../src/agents/swarm-orchestrator.js';
import { buildGraph } from '../src/agents/connection-agent.js';

const mockConfig = { apiBaseUrl: 'https://mock.local', modelName: 'mock' };

async function test() {
  const kbList = ['kb-business-registry', 'kb-sanctions', 'kb-procurement'];
  const tip = 'Company linked to sanctioned directors in procurement contracts';

  console.log('Testing relevance scorer...');
  try {
    const scores = await relevanceScore(tip, kbList, mockConfig);
    console.log('Scores:', scores);
  } catch (e) {
    console.error('Relevance scorer failed:', e.message);
  }

  console.log('\nTesting swarm...');
  try {
    const activated = kbList.map((k) => ({ kbName: k, activated: true }));
    const bundles = await runSwarm(tip, activated, mockConfig);
    console.log('Bundles:', bundles.map((b) => ({ kb: b.kbName, passages: b.passages.length, entities: b.entities.length })));
  } catch (e) {
    console.error('Swarm failed:', e.message);
  }
}

test();
