import React, { useState } from 'react';

export default function ConfigPage({ config, onSave, onBack }) {
  const [url, setUrl] = useState(config.apiBaseUrl || '');
  const [model, setModel] = useState(config.modelName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiBaseUrl: url, modelName: model }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.confirmRequired) {
          const ok = window.confirm('Agents are running. Changing config will reset sessions. Continue?');
          if (ok) {
            // Re-send with force
            const forceRes = await fetch('/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiBaseUrl: url, modelName: model, force: true }),
            });
            if (!forceRes.ok) {
              const forceData = await forceRes.json();
              setError(forceData.error || 'Unknown error');
              setLoading(false);
              return;
            }
          } else {
            setLoading(false);
            return;
          }
        } else {
          setError(data.error || 'Unknown error');
          setLoading(false);
          return;
        }
      }
      onSave({ apiBaseUrl: url, modelName: model });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Saving…' : 'Save & Reset Sessions'}
        </button>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px', marginLeft: 8 }}>
          Cancel
        </button>
      </form>
    </div>
  );
}
