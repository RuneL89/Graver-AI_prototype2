import React, { useState } from 'react';
import { useStore } from '../store.jsx';

export default function VerificationDashboard() {
  const { state, dispatch } = useStore();
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (!state.pendingBlock) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraph: state.pendingBlock.paragraph,
          citations: state.pendingBlock.citations,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch({
          type: 'SET_PENDING_BLOCK',
          payload: { ...state.pendingBlock, verification: data },
        });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function acceptBlock() {
    dispatch({
      type: 'ADD_NOTE_BLOCK',
      payload: { ...state.pendingBlock, id: Date.now() },
    });
    dispatch({ type: 'CLEAR_PENDING_BLOCK' });
  }

  function rejectBlock() {
    dispatch({ type: 'CLEAR_PENDING_BLOCK' });
  }

  if (!state.pendingBlock) {
    return (
      <div style={{ padding: 12, color: '#888', fontSize: 12, borderBottom: '1px solid #eee' }}>
        Click a graph edge to draft a note-block. It will appear here for verification.
      </div>
    );
  }

  const status = state.pendingBlock.verification?.status || 'PENDING';
  const reason = state.pendingBlock.verification?.reason || '';
  const badgeColor = status === 'VERIFIED' ? '#22c55e' : status === 'FLAGGED' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee', fontSize: 13 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Verification Dashboard</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, padding: 8, background: '#f9fafb', borderRadius: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Draft</div>
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>{state.pendingBlock.paragraph}</div>
        </div>
        <div style={{ flex: 1, padding: 8, background: '#f9fafb', borderRadius: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sources</div>
          {state.pendingBlock.citations.map((c, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 4, color: '#555' }}>
              <strong>{c.source}:</strong> {c.passage.slice(0, 120)}…
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ background: badgeColor, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
          {status}
        </span>
        {reason && <span style={{ color: '#666', fontSize: 11 }}>{reason}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!state.pendingBlock.verification && (
          <button onClick={handleVerify} disabled={verifying} style={{ padding: '4px 12px', fontSize: 12 }}>
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        )}
        {status === 'VERIFIED' && (
          <button onClick={acceptBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Accept into Composer</button>
        )}
        {status === 'FLAGGED' && (
          <button onClick={rejectBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Reject</button>
        )}
        {state.pendingBlock.verification && status === 'VERIFIED' && (
          <button onClick={rejectBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Discard</button>
        )}
      </div>
    </div>
  );
}
