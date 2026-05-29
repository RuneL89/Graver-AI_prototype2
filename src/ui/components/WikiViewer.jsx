import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import { useStore } from '../store.jsx';
import { readWikiIndex, loadWikiPage } from '../../lib/wikiStore.js';
import { parseIndex } from '../../knowledge/wiki-page.js';

const SECTIONS = [
  { key: 'entities', label: 'Entities', pageType: 'entity' },
  { key: 'concepts', label: 'Concepts', pageType: 'concept' },
  { key: 'sources', label: 'Sources', pageType: 'source' },
  { key: 'synthesis', label: 'Synthesis', pageType: 'synthesis' },
];

export default function WikiViewer({ kbName, onClose }) {
  const { state } = useStore();
  const [index, setIndex] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageContent, setPageContent] = useState('');
  const [titleMap, setTitleMap] = useState(new Map());
  const mountedRef = useRef(true);
  const selectedPageRef = useRef(selectedPage);
  useEffect(() => {
    selectedPageRef.current = selectedPage;
  }, [selectedPage]);

  const loadIndexAndPages = useCallback(async () => {
    mountedRef.current = true;
    const indexMd = await readWikiIndex(kbName);
    if (!mountedRef.current) return;
    const parsed = parseIndex(indexMd);
    setIndex(parsed);

    const map = new Map();
    for (const section of SECTIONS) {
      for (const item of (parsed[section.key] || [])) {
        map.set(item.title, section.pageType);
      }
    }
    setTitleMap(map);

    // Try to preserve currently selected page if it still exists
    const currentTitle = selectedPageRef.current?.title;
    if (currentTitle && map.has(currentTitle)) {
      await showPage(currentTitle, map);
    } else {
      for (const section of SECTIONS) {
        const items = parsed[section.key] || [];
        if (items.length > 0) {
          await showPage(items[0].title, map);
          break;
        }
      }
    }
  }, [kbName]);

  useEffect(() => {
    loadIndexAndPages();
    return () => { mountedRef.current = false; };
  }, [kbName, loadIndexAndPages]);

  // Auto-refresh when ingestion completes
  useEffect(() => {
    if (state.ingestion?.status === 'done') {
      loadIndexAndPages();
    }
  }, [state.ingestion?.status, loadIndexAndPages]);

  async function showPage(title, map = titleMap) {
    const pageType = map.get(title);
    if (!pageType) return;
    const page = await loadWikiPage(kbName, pageType, title);
    if (!page || !mountedRef.current) return;

    setSelectedPage({ title, type: pageType });

    let html = marked.parse(page.content || '');
    html = html.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      const linkedTitle = p1.trim();
      const exists = map.has(linkedTitle);
      if (exists) {
        return `<a class="wiki-link" href="#" data-title="${linkedTitle}">${linkedTitle}</a>`;
      }
      return `<span class="wiki-link-missing">${linkedTitle}</span>`;
    });
    setPageContent(html);
  }

  function handleClick(e) {
    const link = e.target.closest('.wiki-link');
    if (link) {
      e.preventDefault();
      const title = link.getAttribute('data-title');
      if (title) showPage(title);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
    }}>
      <style>{`
        .wiki-link { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .wiki-link:hover { color: #1e40af; }
        .wiki-link-missing { color: #999; text-decoration: line-through; }
        .wiki-content h1 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .wiki-content h2 { font-size: 1.25rem; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .wiki-content h3 { font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem; }
        .wiki-content p { margin: 0.5rem 0; }
        .wiki-content ul, .wiki-content ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        .wiki-content li { margin: 0.25rem 0; }
        .wiki-content blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid #ccc; color: #555; }
        .wiki-content code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 3px; font-size: 0.9em; }
        .wiki-content pre { background: #f3f4f6; padding: 0.75rem; border-radius: 4px; overflow: auto; }
        .wiki-content pre code { background: none; padding: 0; }
      `}</style>
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f5f5f5',
      }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{kbName}</h2>
        <button onClick={onClose} style={{ padding: '4px 12px', fontSize: 12 }}>Close</button>
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 260,
          borderRight: '1px solid #ccc',
          overflow: 'auto',
          padding: 12,
          background: '#fafafa',
        }}>
          {SECTIONS.map((section) => {
            const items = index?.[section.key] || [];
            if (items.length === 0) return null;
            return (
              <div key={section.key} style={{ marginBottom: 16 }}>
                <h3 style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  color: '#666',
                  letterSpacing: 0.5,
                }}>
                  {section.label}
                </h3>
                {items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => showPage(item.title)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '4px 8px',
                      marginBottom: 2,
                      fontSize: 12,
                      border: 'none',
                      background: selectedPage?.title === item.title ? '#e5e7eb' : 'transparent',
                      cursor: 'pointer',
                      borderRadius: 4,
                      fontWeight: selectedPage?.title === item.title ? 600 : 400,
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {selectedPage ? (
            <>
              <h1 style={{ marginTop: 0, fontSize: 24 }}>{selectedPage.title}</h1>
              <div
                className="wiki-content"
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: pageContent }}
                style={{ lineHeight: 1.6, fontSize: 14 }}
              />
            </>
          ) : (
            <div style={{ color: '#888', fontSize: 14 }}>Select a page from the sidebar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
