import React, { useState } from 'react';
import { useStore } from '../store.jsx';

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
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip: text }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'SET_ACTIVATED_BASES', payload: data.scores || [] });
        dispatch({ type: 'SET_GRAPH', payload: data.graph || { nodes: [], edges: [] } });
      } else {
        alert(data.error || 'Investigation failed');
      }
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
