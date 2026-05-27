import React, { useState, useEffect } from 'react';
import { listKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase, readWikiIndex, getSchema, setSchema, appendWikiLog } from '../../lib/wikiStore.js';
import { lintWiki } from '../../lib/lint.js';

export default function WikiManager() {
  const [kbs, setKbs] = useState([]);
  const [newName, setNewName] = useState('');
  const [newSchema, setNewSchema] = useState('');
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(null);
  const [schema, setSchemaText] = useState('');
  const [lintReport, setLintReport] = useState('');

  async function refresh() {
    const list = await listKnowledgeBases();
    setKbs(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName) return;
    await createKnowledgeBase(newName, newSchema);
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
    setLintReport('');
  }

  async function saveSchema() {
    await setSchema(selected, schema);
    await appendWikiLog(selected, 'Schema updated');
    alert('Schema saved');
  }

  async function runLint() {
    const report = await lintWiki(selected);
    setLintReport(report);
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee', fontSize: 13 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Wiki Manager</h3>
      <div style={{ marginBottom: 8 }}>
        {kbs.map((kb) => (
          <div key={kb} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => selectKb(kb)} style={{ fontSize: 12, padding: '2px 8px' }}>{kb}</button>
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
            <textarea
              value={schema}
              onChange={(e) => setSchemaText(e.target.value)}
              rows={4}
              style={{ width: '100%', fontSize: 11 }}
              placeholder="Schema markdown..."
            />
            <button onClick={saveSchema} style={{ fontSize: 11, padding: '2px 8px' }}>Save Schema</button>
            <button onClick={runLint} style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }}>Lint</button>
          </div>
          {lintReport && (
            <pre style={{ fontSize: 10, marginTop: 4, maxHeight: 100, overflow: 'auto', background: '#fff', padding: 4 }}>{lintReport}</pre>
          )}
          {index && (
            <div style={{ fontSize: 10, marginTop: 4 }}>
              Entities: {index.entities?.length || 0} | Concepts: {index.concepts?.length || 0} | Sources: {index.sources?.length || 0}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
