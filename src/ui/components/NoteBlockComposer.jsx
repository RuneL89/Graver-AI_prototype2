import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { saveSynthesisPage } from '../../lib/wikiStore.js';

export default function NoteBlockComposer() {
  const { state, dispatch } = useStore();
  const [filedIds, setFiledIds] = useState(new Set());
  const [fileDialog, setFileDialog] = useState(null);

  function moveBlock(index, direction) {
    const to = index + direction;
    if (to < 0 || to >= state.noteBlocks.length) return;
    dispatch({ type: 'REORDER_NOTE_BLOCK', payload: { from: index, to } });
  }

  function deleteBlock(index) {
    dispatch({ type: 'REMOVE_NOTE_BLOCK', payload: index });
  }

  function exportMarkdown() {
    const md = state.noteBlocks
      .map((b) => `${b.paragraph}\n\n> Sources: ${b.citations.map((c) => `${c.source} (${c.wikiPage})`).join('; ')}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'draft.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openFileDialog(block) {
    const activeKbs = state.activatedBases.filter((b) => b.activated).map((b) => b.kbName);
    setFileDialog({
      block,
      targetKb: activeKbs[0] || '',
      title: `Analysis: ${block.id}`,
    });
  }

  async function handleFileBlock() {
    if (!fileDialog || !fileDialog.targetKb || !fileDialog.title) return;
    try {
      await saveSynthesisPage(fileDialog.targetKb, {
        title: fileDialog.title,
        query: state.tip || 'Investigation analysis',
        analysis: fileDialog.block.paragraph,
        evidence: fileDialog.block.citations.map((c) => ({ kb: c.source, passage: c.passage })),
        citations: fileDialog.block.citations,
      });
      setFiledIds((prev) => new Set(prev).add(fileDialog.block.id));
      setFileDialog(null);
    } catch (err) {
      alert(`Failed to file: ${err.message}`);
    }
  }

  if (state.loading || !state.graph.nodes || state.graph.nodes.length === 0) {
    return (
      <div style={{ padding: 12, color: '#888', fontSize: 12 }}>
        Waiting for research to complete…
      </div>
    );
  }

  return (
    <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Note-Block Composer</h3>
      {state.noteBlocks.length === 0 && (
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
          No blocks yet. Verify and accept blocks from the dashboard.
        </div>
      )}
      {state.noteBlocks.map((block, idx) => (
        <div key={block.id} style={{ marginBottom: 10, padding: 8, border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}>
          <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 6 }}>{block.paragraph}</div>
          <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
            {block.citations.map((c, i) => (
              <span key={i} style={{ marginRight: 8 }}>[{c.source}]</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{ fontSize: 10, padding: '2px 6px' }}>↑</button>
            <button onClick={() => moveBlock(idx, 1)} disabled={idx === state.noteBlocks.length - 1} style={{ fontSize: 10, padding: '2px 6px' }}>↓</button>
            <button onClick={() => deleteBlock(idx)} style={{ fontSize: 10, padding: '2px 6px', color: '#ef4444' }}>Delete</button>
            {!filedIds.has(block.id) && (
              <button onClick={() => openFileDialog(block)} style={{ fontSize: 10, padding: '2px 6px' }}>File to Wiki</button>
            )}
            {filedIds.has(block.id) && (
              <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 4 }}>✓ Filed</span>
            )}
          </div>
        </div>
      ))}
      {state.noteBlocks.length > 0 && (
        <button onClick={exportMarkdown} style={{ padding: '6px 12px', fontSize: 12 }}>
          Export as Markdown
        </button>
      )}

      {fileDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 6, width: 320 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>File Block to Wiki</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Target KB</label>
              <select value={fileDialog.targetKb} onChange={(e) => setFileDialog({ ...fileDialog, targetKb: e.target.value })} style={{ fontSize: 12, padding: 4, width: '100%' }}>
                {state.activatedBases.filter((b) => b.activated).map((b) => (
                  <option key={b.kbName} value={b.kbName}>{b.kbName}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Title</label>
              <input value={fileDialog.title} onChange={(e) => setFileDialog({ ...fileDialog, title: e.target.value })} style={{ fontSize: 12, padding: 4, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleFileBlock} style={{ fontSize: 12, padding: '4px 10px' }}>Confirm</button>
              <button onClick={() => setFileDialog(null)} style={{ fontSize: 12, padding: '4px 10px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
