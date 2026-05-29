import React, { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { ingestDocument } from '../../lib/ingest.js';

export default function DocumentUploader() {
  const { state } = useStore();
  const [kb, setKb] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('');
  const kbs = state.knowledgeBases;

  useEffect(() => {
    if (kbs.length > 0 && !kb) {
      setKb(kbs[0]);
    }
  }, [kbs]);

  async function handleFiles(files) {
    if (!kb) {
      setStatus('Please select a knowledge base first');
      return;
    }
    setStatus(`Ingesting ${files.length} file(s)...`);
    for (const file of files) {
      try {
        await ingestDocument(kb, file);
      } catch (err) {
        setStatus(`Error ingesting ${file.name}: ${err.message}`);
        return;
      }
    }
    setStatus('Ingest complete');
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function onChange(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee', fontSize: 13 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Document Uploader</h3>
      <select value={kb} onChange={(e) => setKb(e.target.value)} style={{ fontSize: 12, padding: 4, marginBottom: 8 }}>
        <option value="">Select KB</option>
        {kbs.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#3b82f6' : '#ccc'}`,
          borderRadius: 4,
          padding: 16,
          textAlign: 'center',
          background: dragOver ? '#eff6ff' : '#fafafa',
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div style={{ fontSize: 12, color: '#666' }}>Drop files here or click to upload</div>
        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>PDF, TXT, MD, CSV, JSON</div>
      </div>
      <input id="file-input" type="file" multiple style={{ display: 'none' }} onChange={onChange} />
      {status && <div style={{ fontSize: 11, marginTop: 8, color: '#333' }}>{status}</div>}
    </div>
  );
}
