import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { relevanceScore } from '../../agents/relevance-scorer.js';
import { runSwarm } from '../../agents/swarm-orchestrator.js';
import { buildGraph } from '../../agents/connection-agent.js';
import { listKnowledgeBases } from '../../lib/wikiStore.js';

export default function TipEntry() {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: 'SET_TIP', payload: text });
    dispatch({ type: 'SET_LOADING', payload: true });
    setLoading(true);

    try {
      const kbList = await listKnowledgeBases();
      const scores = await relevanceScore(text, kbList, state.config);
      const activated = scores.filter((s) => s.activated);
      const bundles = await runSwarm(text, activated, state.config);
      const graph = await buildGraph(bundles, state.config);
      graph.bundles = bundles;
      dispatch({ type: 'SET_ACTIVATED_BASES', payload: scores });
      dispatch({ type: 'SET_GRAPH', payload: graph });
    } catch (err) {
      alert(err.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      {state.tip ? (
        <div style={{ marginBottom: 8 }}>
          <strong>Tip:</strong>
          <div style={{ fontSize: 14, color: '#333', marginTop: 4 }}>{state.tip}</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter investigative tip..."
            rows={4}
            style={{ width: '100%', padding: 8, resize: 'vertical' }}
          />
          <button type="submit" disabled={loading || !text.trim()} style={{ marginTop: 8, padding: '6px 12px', width: '100%' }}>
            {loading ? 'Analyzing…' : 'Start Investigation'}
          </button>
        </form>
      )}
    </div>
  );
}
