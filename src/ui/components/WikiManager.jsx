import React, { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { listKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase, readWikiIndex, getSchema, setSchema, appendWikiLog } from '../../lib/wikiStore.js';
import { lintWiki } from '../../lib/lint.js';
import { parseIndex } from '../../knowledge/wiki-page.js';
import { validateSchema } from '../../shared/schema-loader.js';

function LintReportView({ report }) {
  const [expanded, setExpanded] = useState({});
  if (!report) return null;

  const structured = report.structured || {};
  const categories = [
    { key: 'contradictions', label: 'Contradictions', severity: 'high', color: '#ef4444' },
    { key: 'staleClaims', label: 'Stale Claims', severity: 'high', color: '#ef4444' },
    { key: 'orphans', label: 'Orphans', severity: 'medium', color: '#d97706' },
    { key: 'missingConcepts', label: 'Missing Concepts', severity: 'medium', color: '#d97706' },
    { key: 'dataGaps', label: 'Data Gaps', severity: 'medium', color: '#d97706' },
    { key: 'brokenLinks', label: 'Broken Links', severity: 'low', color: '#3b82f6' },
    { key: 'suggestions', label: 'Suggestions', severity: 'low', color: '#3b82f6' },
  ];

  function toggle(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard'));
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Lint Report</div>
      {categories.map((cat) => {
        const items = structured[cat.key] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat.key} style={{ marginBottom: 4, borderLeft: `3px solid ${cat.color}`, paddingLeft: 6 }}>
            <button onClick={() => toggle(cat.key)} style={{ fontSize: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: cat.color, fontWeight: 600 }}>
              {expanded[cat.key] ? '▼' : '▶'} {cat.label} ({items.length})
            </button>
            {expanded[cat.key] && (
              <div style={{ marginTop: 4 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ fontSize: 10, marginBottom: 3, color: '#333' }}>
                    {cat.key === 'suggestions' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>[{item.action}] {item.targetPage}: {item.details}</span>
                        <button onClick={() => copyToClipboard(`- [${item.action}] ${item.targetPage}: ${item.details}`)} style={{ fontSize: 9, padding: '1px 4px' }}>Copy</button>
                      </div>
                    ) : cat.key === 'contradictions' ? (
                      <div>
                        <div><strong>{item.pages?.join(' vs ')}</strong> ({item.severity})</div>
                        <div style={{ color: '#666' }}>A: {item.claimA}</div>
                        <div style={{ color: '#666' }}>B: {item.claimB}</div>
                      </div>
                    ) : (
                      <div>
                        {item.page || item.entity || item.concept || item.targetPage || JSON.stringify(item)}
                        {item.severity && <span style={{ color: '#666' }}> ({item.severity})</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {report.text && (
        <pre style={{ fontSize: 10, marginTop: 4, maxHeight: 100, overflow: 'auto', background: '#fff', padding: 4 }}>{report.text}</pre>
      )}
    </div>
  );
}

export default function WikiManager({ onOpenViewer }) {
  const { state, dispatch } = useStore();
  const kbs = state.knowledgeBases;
  const [newName, setNewName] = useState('');
  const [newSchema, setNewSchema] = useState('');
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(null);
  const [schema, setSchemaText] = useState('');
  const [lintReport, setLintReport] = useState(null);
  const [editSchema, setEditSchema] = useState(false);

  async function refresh() {
    const list = await listKnowledgeBases();
    dispatch({ type: 'SET_KNOWLEDGE_BASES', payload: list });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName) return;
    await createKnowledgeBase(newName, newSchema);
    const validation = validateSchema(newSchema || '');
    if (!validation.valid) {
      console.warn(`[WikiManager] New KB ${newName} schema missing sections: ${validation.missing.join(', ')}`);
    }
    setNewName('');
    setNewSchema('');
    refresh();
  }

  async function handleDelete(kbName) {
    if (!window.confirm(`Delete ${kbName}?`)) return;
    await deleteKnowledgeBase(kbName);
    if (selected === kbName) setSelected(null);
    refresh();
  }

  async function selectKb(kbName) {
    setSelected(kbName);
    const idx = await readWikiIndex(kbName);
    setIndex(idx);
    const sch = await getSchema(kbName);
    setSchemaText(sch || '');
    setLintReport(null);
    setEditSchema(false);
  }

  // Auto-refresh selected KB when ingestion completes
  useEffect(() => {
    if (state.ingestion?.status === 'done' && selected) {
      selectKb(selected);
    }
  }, [state.ingestion?.status, selected]);

  async function saveSchema() {
    await setSchema(selected, schema);
    await appendWikiLog(selected, 'Schema updated');
    alert('Schema saved');
  }

  async function runLint() {
    const report = await lintWiki(selected, state.config);
    setLintReport(report);
  }

  const parsedIndex = index ? parseIndex(index) : null;
  const schemaValidation = validateSchema(schema || '');

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee', fontSize: 13 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Wiki Manager</h3>
      <div style={{ marginBottom: 8 }}>
        {kbs.map((kb) => (
          <div key={kb} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => selectKb(kb)} style={{ fontSize: 12, padding: '2px 8px' }}>{kb}</button>
            <button onClick={() => onOpenViewer(kb)} style={{ fontSize: 12, padding: '2px 8px' }}>View</button>
            <button onClick={() => handleDelete(kb)} style={{ fontSize: 12, padding: '2px 8px', color: '#ef4444' }}>Delete</button>
          </div>
        ))}
      </div>
      <form onSubmit={handleCreate} style={{ marginBottom: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New KB name (e.g., kb-mytopic)"
          style={{ padding: 4, fontSize: 12, width: 180 }}
        />
        <button type="submit" style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4 }}>Create</button>
      </form>
      {selected && (
        <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 4, background: '#f9fafb' }}>
          <strong>{selected}</strong>
          <div style={{ marginTop: 4 }}>
            {!editSchema ? (
              <div>
                <pre style={{ fontSize: 11, maxHeight: 120, overflow: 'auto', background: '#fff', padding: 6, border: '1px solid #e5e7eb', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{schema || '(no schema)'}</pre>
                {!schemaValidation.valid && (
                  <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                    ⚠️ Missing sections: {schemaValidation.missing.join(', ')}
                  </div>
                )}
                <button onClick={() => setEditSchema(true)} style={{ fontSize: 11, padding: '2px 8px', marginTop: 4 }}>Edit Schema</button>
              </div>
            ) : (
              <div>
                <textarea
                  value={schema}
                  onChange={(e) => setSchemaText(e.target.value)}
                  rows={6}
                  style={{ width: '100%', fontSize: 11 }}
                  placeholder="Schema markdown..."
                />
                <button onClick={saveSchema} style={{ fontSize: 11, padding: '2px 8px' }}>Save Schema</button>
                <button onClick={() => setEditSchema(false)} style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }}>Cancel</button>
                {!schemaValidation.valid && (
                  <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                    ⚠️ Missing sections: {schemaValidation.missing.join(', ')}
                  </div>
                )}
              </div>
            )}
            <button onClick={runLint} style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }}>Lint</button>
          </div>
          <LintReportView report={lintReport} />
          {parsedIndex && (
            <div style={{ fontSize: 10, marginTop: 4 }}>
              Entities: {parsedIndex.entities?.length || 0} | Concepts: {parsedIndex.concepts?.length || 0} | Sources: {parsedIndex.sources?.length || 0}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
