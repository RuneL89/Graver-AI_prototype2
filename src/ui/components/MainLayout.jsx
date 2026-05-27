import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import TipEntry from './TipEntry.jsx';
import ActiveKbPanel from './ActiveKbPanel.jsx';
import ConnectionGraph from './ConnectionGraph.jsx';
import VerificationDashboard from './VerificationDashboard.jsx';
import NoteBlockComposer from './NoteBlockComposer.jsx';
import ClarifyingQuestionTerminal from './ClarifyingQuestionTerminal.jsx';
import WikiManager from './WikiManager.jsx';
import DocumentUploader from './DocumentUploader.jsx';
import { loadAllDemoData } from '../../lib/demoLoader.js';

export default function MainLayout({ onOpenConfig }) {
  const { state } = useStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);

  async function handleLoadDemo() {
    setDemoLoading(true);
    try {
      await loadAllDemoData();
      alert('Demo data loaded into browser storage');
    } catch (err) {
      alert(err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5' }}>
        <h1 style={{ margin: 0, fontSize: 16 }}>AI Investigative Journalism Prototype</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleLoadDemo} disabled={demoLoading} style={{ padding: '4px 12px', fontSize: 12 }}>
            {demoLoading ? 'Loading…' : 'Load Demo Data'}
          </button>
          <button onClick={() => setShowManager((s) => !s)} style={{ padding: '4px 12px', fontSize: 12 }}>
            {showManager ? 'Hide Wiki' : 'Manage Wikis'}
          </button>
          <button onClick={onOpenConfig} style={{ padding: '4px 12px', fontSize: 12 }}>Settings</button>
        </div>
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left pane */}
        <div style={{ width: 320, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <TipEntry />
          <ActiveKbPanel />
          {showManager && <WikiManager />}
          {showManager && <DocumentUploader />}
          <div style={{ flex: 1, minHeight: 0 }} />
          <ClarifyingQuestionTerminal />
        </div>
        {/* Center pane */}
        <div style={{ flex: 1, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
          <ConnectionGraph />
        </div>
        {/* Right pane */}
        <div style={{ width: 360, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <VerificationDashboard />
          <NoteBlockComposer />
        </div>
      </div>
    </div>
  );
}
