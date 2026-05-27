import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store.jsx';
import ConfigPage from './components/ConfigPage.jsx';
import MainLayout from './components/MainLayout.jsx';

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem('llm-config');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { apiBaseUrl: '', modelName: '' };
}

function AppContent() {
  const [page, setPage] = useState('main');
  const { state, dispatch } = useStore();

  useEffect(() => {
    dispatch({ type: 'SET_CONFIG', payload: loadStoredConfig() });
  }, [dispatch]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {page === 'config' ? (
        <ConfigPage
          config={state.config}
          onSave={(cfg) => {
            dispatch({ type: 'SET_CONFIG', payload: cfg });
            setPage('main');
          }}
          onBack={() => setPage('main')}
        />
      ) : (
        <MainLayout onOpenConfig={() => setPage('config')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
