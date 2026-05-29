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
  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);

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

  async function testConnection() {
    setError('');
    setTestStatus('');
    if (!url || !validateHttpsUrl(url)) {
      setError('Enter a valid HTTPS URL first');
      return;
    }
    if (!model) {
      setError('Enter a model name first');
      return;
    }
    if (!apiKey) {
      setError('Enter an API key first');
      return;
    }

    setTesting(true);
    try {
      const baseUrl = url.replace(/\/$/, '');
      const payload = {
        model: model,
        messages: [
          { role: 'user', content: 'Say "pong" and nothing else.' }
        ],
        max_tokens: 5,
        temperature: 0,
      };

      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        setTestStatus('');
        setError(`Connection failed (${res.status}): ${errText.slice(0, 200)}`);
        return;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      setTestStatus(`✅ Connection OK. Model responded: "${content.trim()}"`);
    } catch (err) {
      setTestStatus('');
      const isNetworkError = err.message === 'Failed to fetch';
      setError(
        isNetworkError
          ? `Network error: cannot reach ${url}/v1/chat/completions. Check URL, internet, and CORS.`
          : `Connection error: ${err.message}`
      );
    } finally {
      setTesting(false);
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
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            style={{ padding: '8px 16px' }}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
        {testStatus && <div style={{ color: '#22c55e', marginBottom: 16 }}>{testStatus}</div>}
        {error && <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>}
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
