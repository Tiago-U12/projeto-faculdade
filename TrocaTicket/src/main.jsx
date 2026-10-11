import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import './styles.css';
import './workspace.css';
import { StoreProvider } from './context/Store';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
<HashRouter>
  <StoreProvider>
    <App />
  </StoreProvider>
</HashRouter>
  </React.StrictMode>,
);
