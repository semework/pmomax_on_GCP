import React from 'react';

type State = { hasError: boolean; error?: unknown; errorInfo?: string };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: any) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error', error, info);
    const stack = typeof info?.componentStack === 'string' ? info.componentStack : '';
    this.setState({ errorInfo: stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>A rendering error occurred in the application.</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#111', color: '#f8f8f8', padding: 12, borderRadius: 10, overflow: 'auto' }}>
            {(() => {
              const err = this.state.error as any;
              if (err?.stack) return String(err.stack);
              if (err?.message) return String(err.message);
              return String(err);
            })()}
          </pre>
          {this.state.errorInfo ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, background: '#0b0b0b', color: '#cbd5f5', padding: 12, borderRadius: 10, overflow: 'auto', marginTop: 10 }}>
              {this.state.errorInfo}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
