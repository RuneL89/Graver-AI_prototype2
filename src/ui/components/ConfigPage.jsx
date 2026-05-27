import React, { useState } from 'react';

function validateHttpsUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ConfigPage({ config, onSave, onBack }) {
  const [url, setUrl] = useState(config.apiBaseUrl || '');
  const [model, setModel] = useState(config.modelName || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [error, setError] = useState('');

  function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!url || !validateHttpsUrl(url)) {
      setError('Invalid HTTPS URL for API Base URL');
      return;
    }
    if (!model) {
      setError('Model name is required');
      return;
    }
    const cfg = { apiBaseUrl: url, modelName: model, apiKey };
    localStorage.setItem('llm-config', JSON.stringify(cfg));
    onSave(cfg);
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Configuration</h1>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 16 }}>
          <label>LLM API Base URL (HTTPS)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.openai.com"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Model Name</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>API Key (stored in browser)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <button type="submit" style={{ padding: '8px 16px' }}>
          Save
        </button>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px', marginLeft: 8 }}>
          Cancel
        </button>
      </form>
    </div>
  );
}
