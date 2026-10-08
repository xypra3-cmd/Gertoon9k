import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import { registerServiceWorker } from './lib/pwa';
import { initMonitoring } from './lib/monitoring';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
initMonitoring();
