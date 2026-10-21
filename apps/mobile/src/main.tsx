import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './BootScreen';
import { ThemeProvider } from './theme';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);

window.setTimeout(() => {
  const ready = (window as Window & { __nodoReady?: () => void }).__nodoReady;
  ready?.();
}, 0);
