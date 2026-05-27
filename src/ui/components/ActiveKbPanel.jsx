import React, { useState } from 'react';
import { useStore } from '../store.jsx';

export default function ActiveKbPanel() {
  const { state, dispatch } = useStore();
  const [modified, setModified] = useState(false);

  function toggleBase(kbName) {
    const next = state.activatedBases.map((b) =>
      b.kbName === kbName ? { ...b, activated: !b.activated } : b
    );
    dispatch({ type: 'SET_ACTIVATED_BASES', payload: next });
    setModified(true);
  }

  async function rerun() {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const activated = state.activatedBases.filter((b) => b.activated);
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip: state.tip }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'SET_ACTIVATED_BASES', payload: data.scores || [] });
        dispatch({ type: 'SET_GRAPH', payload: data.graph || { nodes: [], edges: [] } });
        setModified(false);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  if (!state.activatedBases.length) {
    return (
      <div style={{ padding: 12, color: '#888', fontSize: 12 }}>
        No knowledge bases activated yet.
      </div>
    );
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Active Knowledge Bases</h3>
      {state.activatedBases.map((b) => (
        <div key={b.kbName} style={{ marginBottom: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={b.activated}
              onChange={() => toggleBase(b.kbName)}
            />
            <span style={{ fontWeight: 600 }}>{b.kbName}</span>
          </label>
          <div style={{ marginLeft: 22, color: '#666' }}>
            Score: {b.score.toFixed(2)} — {b.justification}
          </div>
        </div>
      ))}
      {modified && (
        <button onClick={rerun} style={{ padding: '4px 12px', fontSize: 12 }}>
          Re-run Investigation
        </button>
      )}
    </div>
  );
}
