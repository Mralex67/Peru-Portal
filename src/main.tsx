import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically forward API calls to cloud backend when hosted on GitHub Pages
const CLOUD_BACKEND_URL = 'https://ais-pre-iydhue5qk4b7wusoszmqp2-732238089491.us-east1.run.app';
if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${CLOUD_BACKEND_URL}${input}`;
    }
    return originalFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
