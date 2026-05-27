import React from 'react';
import { useStore } from '../store.jsx';

export default function NoteBlockComposer() {
  const { state, dispatch } = useStore();

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
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{ fontSize: 10, padding: '2px 6px' }}>↑</button>
            <button onClick={() => moveBlock(idx, 1)} disabled={idx === state.noteBlocks.length - 1} style={{ fontSize: 10, padding: '2px 6px' }}>↓</button>
            <button onClick={() => deleteBlock(idx)} style={{ fontSize: 10, padding: '2px 6px', color: '#ef4444' }}>Delete</button>
          </div>
        </div>
      ))}
      {state.noteBlocks.length > 0 && (
        <button onClick={exportMarkdown} style={{ padding: '6px 12px', fontSize: 12 }}>
          Export as Markdown
        </button>
      )}
    </div>
  );
}
