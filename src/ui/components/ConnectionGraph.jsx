import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import cytoscape from 'cytoscape';

export default function ConnectionGraph() {
  const { state, dispatch } = useStore();
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      style: [
        { selector: 'node', style: { label: 'data(label)', width: 40, height: 40, 'background-color': '#60a5fa', color: '#fff', 'text-valign': 'center', 'text-halign': 'center', 'font-size': 10 } },
        { selector: 'node[type="person"]', style: { 'background-color': '#f87171' } },
        { selector: 'node[type="company"]', style: { 'background-color': '#60a5fa' } },
        { selector: 'node[type="contract"]', style: { 'background-color': '#34d399' } },
        { selector: 'node[type="event"]', style: { 'background-color': '#fbbf24' } },
        { selector: 'edge', style: { width: 2, 'line-color': '#9ca3af', 'target-arrow-color': '#9ca3af', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': 9, color: '#666' } },
      ],
      layout: { name: 'cose', padding: 10 },
    });
    cyRef.current = cy;

    cy.on('tap', 'edge', async (evt) => {
      const edge = evt.target;
      const connectionId = `${edge.source().id()}-${edge.target().id()}`;
      dispatch({ type: 'SET_SELECTED_CONNECTION', payload: connectionId });
      setWriting(true);
      try {
        const res = await fetch('/api/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId, bundles: state.graph.bundles || [] }),
        });
        const data = await res.json();
        if (res.ok) {
          dispatch({ type: 'SET_PENDING_BLOCK', payload: data });
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setWriting(false);
      }
    });

    return () => cy.destroy();
  }, [dispatch]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().remove();
    const nodes = (state.graph.nodes || []).map((n) => ({ data: { id: n.id, label: n.label, type: n.type } }));
    const edges = (state.graph.edges || []).map((e, i) => ({ data: { id: `e${i}`, source: e.source, target: e.target, label: e.label, provenance: e.provenance } }));
    cy.add([...nodes, ...edges]);
    cy.layout({ name: 'cose', padding: 10, animate: true, animationDuration: 300 }).run();
  }, [state.graph]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 14, fontWeight: 600 }}>
        Connection Graph {writing && <span style={{ color: '#888', fontWeight: 400, marginLeft: 8 }}>Drafting…</span>}
      </div>
      <div ref={containerRef} style={{ flex: 1, background: '#fafafa' }} />
      {state.graph.aliases && state.graph.aliases.length > 0 && (
        <div style={{ padding: 8, borderTop: '1px solid #eee', fontSize: 12, background: '#fffbeb' }}>
          <strong>Alias Flags:</strong>
          {state.graph.aliases.map((a, i) => (
            <div key={i} style={{ marginTop: 4 }}>{a.names?.join(' = ')} — {a.reason}</div>
          ))}
        </div>
      )}
    </div>
  );
}
