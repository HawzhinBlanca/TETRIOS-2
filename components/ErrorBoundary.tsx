
import React, { ReactNode, ErrorInfo } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { telemetry } from '../utils/TelemetryManager';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  readonly props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Telemetry: Capture critical crash
    telemetry.log('ERROR', 'App Crash Detected', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
    });
    
    telemetry.incrementCounter('app_crash_total', 1);
  }

  handleReset = () => {
      telemetry.log('INFO', 'User initiated system reboot');
      window.location.reload();
  }

  handleSafeRecover = () => {
      // Save State Recovery:
      // Clears volatile UI/Settings state that might be causing render crashes
      // but PRESERVES critical progression data (Adventure/Profile)
      if (window.confirm("This will reset Game Settings and UI state but keep your Adventure progress. Continue?")) {
          telemetry.log('WARN', 'Performing Safe Recovery');
          safeStorage.removeItem('tetrios-game-settings-store');
          safeStorage.removeItem('tetrios-ui-store');
          safeStorage.removeItem('tetrios-effect-store'); 
          // Explicitly NOT clearing 'tetrios-adventure-store' or 'tetrios-profile-store'
          window.location.reload();
      }
  }

  handleFactoryReset = () => {
      if (window.confirm("WARNING: This will clear ALL progress including Adventure Mode and High Scores. Are you sure?")) {
          telemetry.log('WARN', 'Performing Factory Reset');
          safeStorage.clear();
          window.location.reload();
      }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          backgroundColor: '#030712',
          color: '#ef4444',
          fontFamily: 'Rajdhani, sans-serif',
          textAlign: 'center',
          padding: '2rem',
          zIndex: 9999,
          position: 'relative'
        }}>
          <h1 style={{ fontSize: '3em', marginBottom: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Critical Error</h1>
          <p style={{ fontSize: '1.2em', maxWidth: '600px', marginBottom: '40px', color: '#9ca3af' }}>
            A fatal exception has occurred within the simulation matrix.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '16px 32px',
                  backgroundColor: '#06b6d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
                }}
              >
                Reboot System
              </button>
              
              <button
                onClick={this.handleSafeRecover}
                style={{
                  padding: '16px 32px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  boxShadow: '0 0 30px rgba(22, 163, 74, 0.4)',
                }}
              >
                Safe Recover
              </button>

              <button
                onClick={this.handleFactoryReset}
                style={{
                  padding: '16px 32px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '2px solid #ef4444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Factory Reset
              </button>
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.8em', color: '#4b5563' }}>
            Safe Recover preserves Adventure Progress & High Scores.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
