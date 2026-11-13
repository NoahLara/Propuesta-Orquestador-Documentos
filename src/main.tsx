import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import { NavigationProvider } from './nav';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <AppStoreProvider>
        <NavigationProvider>
          <App />
        </NavigationProvider>
      </AppStoreProvider>
    </ToastProvider>
  </React.StrictMode>,
);
