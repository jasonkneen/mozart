import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConductorStoreProvider } from './services/store';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConductorStoreProvider>
      <App />
    </ConductorStoreProvider>
  </React.StrictMode>
);
