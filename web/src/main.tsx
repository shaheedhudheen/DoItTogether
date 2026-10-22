import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { queryClient } from './lib/queryClient';
import { setQueryClient } from './socket';
import './index.css';

// Register the shared cache before anything renders so socket-driven
// invalidations also work on routes outside AppLayout (e.g. onboarding).
setQueryClient(queryClient);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
