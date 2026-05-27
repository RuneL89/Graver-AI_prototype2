import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// In-memory global config
let globalConfig = {
  apiBaseUrl: '',
  modelName: '',
};

let agentsRunning = false;

function validateHttpsUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// API Routes
app.post('/api/config', (req, res) => {
  const { apiBaseUrl, modelName } = req.body;
  if (!apiBaseUrl || !validateHttpsUrl(apiBaseUrl)) {
    return res.status(400).json({ error: 'Invalid HTTPS URL for API Base URL' });
  }
  if (!modelName || typeof modelName !== 'string') {
    return res.status(400).json({ error: 'Model name is required' });
  }
  if (agentsRunning && !req.body.force) {
    return res.status(409).json({
      error: 'Agents are currently running. Confirm reset to change config.',
      confirmRequired: true,
    });
  }
  globalConfig = { apiBaseUrl, modelName };
  res.json({ success: true, config: globalConfig });
});

app.get('/api/config', (req, res) => {
  res.json(globalConfig);
});

app.post('/api/investigate', async (req, res) => {
  try {
    agentsRunning = true;
    const { tip } = req.body;
    const { relevanceScore } = await import('./agents/relevance-scorer.js');
    const { runSwarm } = await import('./agents/swarm-orchestrator.js');
    const { buildGraph } = await import('./agents/connection-agent.js');

    const kbList = await listKnowledgeBases();
    const scores = await relevanceScore(tip, kbList, globalConfig);
    const activated = scores.filter((s) => s.activated);
    const bundles = await runSwarm(tip, activated, globalConfig);
    const graph = await buildGraph(bundles, globalConfig);

    // Store last bundles in graph for frontend reference
    graph.bundles = bundles;

    res.json({ scores, bundles, graph });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    agentsRunning = false;
  }
});

app.post('/api/write', async (req, res) => {
  try {
    agentsRunning = true;
    const { connectionId, bundles } = req.body;
    const { draftParagraph } = await import('./agents/writing-agent.js');
    const result = await draftParagraph(connectionId, bundles, globalConfig);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    agentsRunning = false;
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    agentsRunning = true;
    const { paragraph, citations } = req.body;
    const { verifyBlock } = await import('./agents/verification-agent.js');
    const result = await verifyBlock(paragraph, citations, globalConfig);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    agentsRunning = false;
  }
});

app.post('/api/clarify', async (req, res) => {
  try {
    agentsRunning = true;
    const { question, sessionContext } = req.body;
    const { routeQuestion } = await import('./agents/question-router.js');
    const result = await routeQuestion(question, sessionContext, globalConfig);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    agentsRunning = false;
  }
});

app.get('/api/knowledge-bases', async (req, res) => {
  try {
    const kbs = await listKnowledgeBases();
    res.json(kbs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files in production, but in dev Vite handles it
app.use(express.static(path.resolve(__dirname, '../dist')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

async function listKnowledgeBases() {
  const dataDir = path.resolve('data');
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const kbs = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('kb-') && entry.name !== 'kb-registry') {
      kbs.push(entry.name);
    }
  }
  return kbs;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
