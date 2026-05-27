import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store.jsx';

export default function ClarifyingQuestionTerminal() {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.conversation]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'user', text: question } });
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          sessionContext: {
            activeBases: state.activatedBases.filter((b) => b.activated).map((b) => b.kbName),
            history: state.conversation.filter((c) => c.role === 'user').map((c) => c.text),
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'UPDATE_FROM_CLARIFY', payload: { graph: data.graph } });
        dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'assistant', text: 'Evidence updated in graph.' } });
      } else {
        dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'assistant', text: `Error: ${data.error}` } });
      }
    } catch (err) {
      dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'assistant', text: `Error: ${err.message}` } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid #ccc', display: 'flex', flexDirection: 'column', maxHeight: 240 }}>
      <div style={{ padding: '8px 12px', background: '#f5f5f5', fontSize: 12, fontWeight: 600 }}>
        Clarifying Questions
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8, fontSize: 12 }}>
        {state.conversation.map((msg, i) => (
          <div key={i} style={{ marginBottom: 6, color: msg.role === 'user' ? '#111' : '#555' }}>
            <strong>{msg.role === 'user' ? 'You' : 'System'}:</strong> {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', padding: 8, borderTop: '1px solid #eee' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question…"
          style={{ flex: 1, padding: 6, fontSize: 12 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '6px 12px', fontSize: 12, marginLeft: 8 }}>
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
