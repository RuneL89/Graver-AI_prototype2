import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { verifyBlock } from '../../agents/verification-agent.js';
import { saveSynthesisPage } from '../../lib/wikiStore.js';

export default function VerificationDashboard() {
  const { state, dispatch } = useStore();
  const [verifying, setVerifying] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileTargetKb, setFileTargetKb] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileSuccess, setFileSuccess] = useState('');
  const [fileError, setFileError] = useState('');

  async function handleVerify() {
    if (!state.pendingBlock) return;
    setVerifying(true);
    try {
      const data = await verifyBlock(state.pendingBlock.paragraph, state.pendingBlock.citations, state.config);
      dispatch({
        type: 'SET_PENDING_BLOCK',
        payload: { ...state.pendingBlock, verification: data },
      });
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

  function openFileDialog() {
    const activeKbs = state.activatedBases.filter((b) => b.activated).map((b) => b.kbName);
    setFileTargetKb(activeKbs[0] || '');
    setFileTitle(state.pendingBlock.suggestedTitle || `Connection: ${state.selectedConnection || 'analysis'}`);
    setFileSuccess('');
    setFileError('');
    setFileDialogOpen(true);
  }

  async function handleFileToWiki() {
    if (!fileTargetKb || !fileTitle) return;
    try {
      await saveSynthesisPage(fileTargetKb, {
        title: fileTitle,
        query: state.tip || 'Investigation analysis',
        analysis: state.pendingBlock.paragraph,
        evidence: state.pendingBlock.citations.map((c) => ({ kb: c.source, passage: c.passage })),
        citations: state.pendingBlock.citations,
      });
      setFileSuccess(`Filed to wiki as [[${fileTitle}]]`);
      setFileDialogOpen(false);
    } catch (err) {
      setFileError(err.message);
    }
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!state.pendingBlock.verification && (
          <button onClick={handleVerify} disabled={verifying} style={{ padding: '4px 12px', fontSize: 12 }}>
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        )}
        {status === 'VERIFIED' && (
          <>
            <button onClick={acceptBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Accept into Composer</button>
            <button onClick={openFileDialog} style={{ padding: '4px 12px', fontSize: 12 }}>File to Wiki</button>
          </>
        )}
        {status === 'FLAGGED' && (
          <button onClick={rejectBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Reject</button>
        )}
        {state.pendingBlock.verification && status === 'VERIFIED' && (
          <button onClick={rejectBlock} style={{ padding: '4px 12px', fontSize: 12 }}>Discard</button>
        )}
      </div>
      {fileSuccess && <div style={{ fontSize: 11, marginTop: 8, color: '#22c55e' }}>{fileSuccess}</div>}

      {fileDialogOpen && (
        <div style={{ marginTop: 12, padding: 10, border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>File to Wiki</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Target KB</label>
            <select value={fileTargetKb} onChange={(e) => setFileTargetKb(e.target.value)} style={{ fontSize: 12, padding: 4, width: '100%' }}>
              {state.activatedBases.filter((b) => b.activated).map((b) => (
                <option key={b.kbName} value={b.kbName}>{b.kbName}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Title</label>
            <input value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} style={{ fontSize: 12, padding: 4, width: '100%' }} />
          </div>
          {fileError && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{fileError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleFileToWiki} style={{ fontSize: 11, padding: '4px 10px' }}>Confirm</button>
            <button onClick={() => setFileDialogOpen(false)} style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
