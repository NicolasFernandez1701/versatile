import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './core/styles/index.css'; // Import the new Design System
import App from './App.tsx';
import { GlobalAlertProvider } from './ui/GlobalAlertProvider';

import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', minHeight: '100vh' }}>
          <h1>Algo falló en React</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GlobalAlertProvider>
        <App />
      </GlobalAlertProvider>
    </ErrorBoundary>
  </StrictMode>
);
