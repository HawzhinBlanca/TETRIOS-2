import React, { Component, ReactNode, ErrorInfo } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: Correctly extend React.Component with its generic types
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  // Explicitly declare props to satisfy TypeScript in some environments
  readonly props: Readonly<ErrorBoundaryProps>;

  // Added constructor to ensure `this.props` is correctly initialized and typed.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#030712',
          color: '#ef4444',
          fontFamily: 'Rajdhani, sans-serif',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>System Critical Error</h1>
          <p style={{ fontSize: '1.2em', maxWidth: '600px' }}>
            A catastrophic error has occurred. Please try refreshing the page.
            If the problem persists, contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              backgroundColor: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1em'
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}