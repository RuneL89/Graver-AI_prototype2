import React, { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { ingestDocument } from '../../lib/ingest.js';

export default function DocumentUploader() {
  const { state, dispatch } = useStore();
  const [kb, setKb] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [localStatus, setLocalStatus] = useState('');
  const kbs = state.knowledgeBases;
  const ingestion = state.ingestion;

  useEffect(() => {
    if (kbs.length > 0 && !kb) {
      setKb(kbs[0]);
    }
  }, [kbs]);

  function validateConfig() {
    const { apiBaseUrl, modelName } = state.config || {};
    if (!apiBaseUrl || !modelName) {
      return 'Please configure LLM API in Settings before uploading documents.';
    }
    if (apiBaseUrl && !apiBaseUrl.startsWith('https://')) {
      return 'LLM API URL must be a valid HTTPS endpoint.';
    }
    return null;
  }

  function getProgressMessage() {
    switch (ingestion.status) {
      case 'extracting':
        return `Extracting text from ${ingestion.fileName}…`;
      case 'analyzing':
        return `Analyzing with LLM…`;
      case 'writing':
        return 'Updating wiki pages…';
      case 'done':
        return 'Ingest complete';
      case 'error':
        return `Error: ${ingestion.error}`;
      default:
        return localStatus;
    }
  }

  async function handleFiles(files) {
    if (!kb) {
      setLocalStatus('Please select a knowledge base first');
      return;
    }
    const configError = validateConfig();
    if (configError) {
      setLocalStatus(configError);
      return;
    }

    for (const file of files) {
      dispatch({ type: 'INGEST_START', payload: { fileName: file.name, kbName: kb } });
      try {
        await ingestDocument(kb, file, state.config, (status, ...args) => {
          dispatch({ type: 'INGEST_PROGRESS', payload: { status } });
        });
        dispatch({ type: 'INGEST_COMPLETE' });
      } catch (err) {
        dispatch({ type: 'INGEST_ERROR', payload: { error: err.message } });
      }
    }
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

  const isIngesting = ingestion.status === 'extracting' || ingestion.status === 'analyzing' || ingestion.status === 'writing';
  const statusMessage = getProgressMessage();

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
          cursor: isIngesting ? 'not-allowed' : 'pointer',
          opacity: isIngesting ? 0.6 : 1,
        }}
        onClick={() => {
          if (!isIngesting) document.getElementById('file-input')?.click();
        }}
      >
        <div style={{ fontSize: 12, color: '#666' }}>
          {isIngesting ? 'Ingestion in progress…' : 'Drop files here or click to upload'}
        </div>
        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>PDF, TXT, MD, CSV, JSON</div>
      </div>
      <input id="file-input" type="file" multiple style={{ display: 'none' }} onChange={onChange} disabled={isIngesting} />
      {statusMessage && (
        <div style={{ fontSize: 11, marginTop: 8, color: ingestion.status === 'error' ? '#ef4444' : '#333' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}
