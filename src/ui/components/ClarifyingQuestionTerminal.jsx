import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { routeQuestion } from '../../agents/question-router.js';
import { saveSynthesisPage } from '../../lib/wikiStore.js';

export default function ClarifyingQuestionTerminal() {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveDialog, setSaveDialog] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState(new Set());
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
      const data = await routeQuestion(question, {
        activeBases: state.activatedBases.filter((b) => b.activated).map((b) => b.kbName),
        history: state.conversation.filter((c) => c.role === 'user').map((c) => c.text),
      }, state.config);
      dispatch({ type: 'UPDATE_FROM_CLARIFY', payload: { graph: data.graph } });
      dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'assistant', text: 'Evidence updated in graph.', bundles: data.bundles } });
    } catch (err) {
      dispatch({ type: 'ADD_CONVERSATION', payload: { role: 'assistant', text: `Error: ${err.message}` } });
    } finally {
      setLoading(false);
    }
  }

  function openSaveDialog(questionText, bundles) {
    const activeKbs = state.activatedBases.filter((b) => b.activated).map((b) => b.kbName);
    setSaveDialog({
      question: questionText,
      bundles: bundles || [],
      targetKb: activeKbs[0] || '',
      title: `Query: ${questionText.slice(0, 40)}`,
    });
  }

  async function handleSaveAnswer() {
    if (!saveDialog || !saveDialog.targetKb || !saveDialog.title) return;
    try {
      const evidence = (saveDialog.bundles || []).flatMap((b) =>
        b.passages.map((p) => ({ kb: b.kbName, passage: p.text.slice(0, 200) }))
      );
      const citations = (saveDialog.bundles || []).flatMap((b) =>
        b.passages.map((p) => ({ source: b.kbName, passage: p.text, wikiPage: p.sourcePage }))
      );
      await saveSynthesisPage(saveDialog.targetKb, {
        title: saveDialog.title,
        query: saveDialog.question,
        analysis: 'Evidence updated in graph based on clarifying question.',
        evidence,
        citations,
      });
      setSavedQuestions((prev) => new Set(prev).add(saveDialog.question));
      setSaveDialog(null);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
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
            {msg.role === 'assistant' && msg.text === 'Evidence updated in graph.' && !savedQuestions.has(state.conversation[i - 1]?.text) && (
              <button
                onClick={() => openSaveDialog(state.conversation[i - 1]?.text, msg.bundles)}
                style={{ fontSize: 10, padding: '2px 6px', marginLeft: 8 }}
              >
                Save Answer to Wiki
              </button>
            )}
            {msg.role === 'assistant' && savedQuestions.has(state.conversation[i - 1]?.text) && (
              <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 8 }}>✓ Saved</span>
            )}
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

      {saveDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 6, width: 320 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Save Answer to Wiki</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Target KB</label>
              <select value={saveDialog.targetKb} onChange={(e) => setSaveDialog({ ...saveDialog, targetKb: e.target.value })} style={{ fontSize: 12, padding: 4, width: '100%' }}>
                {state.activatedBases.filter((b) => b.activated).map((b) => (
                  <option key={b.kbName} value={b.kbName}>{b.kbName}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Title</label>
              <input value={saveDialog.title} onChange={(e) => setSaveDialog({ ...saveDialog, title: e.target.value })} style={{ fontSize: 12, padding: 4, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveAnswer} style={{ fontSize: 12, padding: '4px 10px' }}>Confirm</button>
              <button onClick={() => setSaveDialog(null)} style={{ fontSize: 12, padding: '4px 10px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
