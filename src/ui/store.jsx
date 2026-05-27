import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  config: { apiBaseUrl: '', modelName: '' },
  tip: '',
  loading: false,
  activatedBases: [],
  graph: { nodes: [], edges: [], aliases: [] },
  noteBlocks: [],
  pendingBlock: null,
  conversation: [],
  selectedConnection: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_TIP':
      return { ...state, tip: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ACTIVATED_BASES':
      return { ...state, activatedBases: action.payload };
    case 'SET_GRAPH':
      return { ...state, graph: action.payload };
    case 'ADD_NOTE_BLOCK':
      return { ...state, noteBlocks: [...state.noteBlocks, action.payload] };
    case 'REMOVE_NOTE_BLOCK':
      return {
        ...state,
        noteBlocks: state.noteBlocks.filter((_, i) => i !== action.payload),
      };
    case 'REORDER_NOTE_BLOCK':
      {
        const { from, to } = action.payload;
        const blocks = [...state.noteBlocks];
        const [moved] = blocks.splice(from, 1);
        blocks.splice(to, 0, moved);
        return { ...state, noteBlocks: blocks };
      }
    case 'SET_PENDING_BLOCK':
      return { ...state, pendingBlock: action.payload };
    case 'CLEAR_PENDING_BLOCK':
      return { ...state, pendingBlock: null };
    case 'ADD_CONVERSATION':
      return { ...state, conversation: [...state.conversation, action.payload] };
    case 'SET_SELECTED_CONNECTION':
      return { ...state, selectedConnection: action.payload };
    case 'UPDATE_FROM_CLARIFY':
      return {
        ...state,
        graph: action.payload.graph || state.graph,
        activatedBases: action.payload.activatedBases || state.activatedBases,
        conversation: [...state.conversation, { role: 'system', text: 'New evidence added.' }],
      };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
