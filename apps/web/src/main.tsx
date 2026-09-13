import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { useThemeStore, applyTheme } from './store/themeStore';

import { APIProvider } from '@vis.gl/react-google-maps';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  return <>{children}</>;
}

function OptionalGoogleMaps({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_MAPS_KEY) return <>{children}</>;
  return <APIProvider apiKey={GOOGLE_MAPS_KEY}>{children}</APIProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <OptionalGoogleMaps>
          <App />
        </OptionalGoogleMaps>
        <Toaster position="top-right" />
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
