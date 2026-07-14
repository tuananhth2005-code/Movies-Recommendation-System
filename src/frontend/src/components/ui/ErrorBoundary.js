import React from 'react';

/**
 * Global error boundary.
 *
 * Catches any error thrown while rendering the React tree (including React's
 * "Maximum update depth exceeded" infinite-loop error) and shows the message
 * + component stack ON THE PAGE, so problems are visible without opening
 * DevTools. Without this, a render error leaves a blank/frozen screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Also log so it shows up in the terminal/console if available.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null, info: null });
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const message = error?.message || String(error);
    const isLoop = /maximum update depth/i.test(message);

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0e0e0e',
          color: '#fff',
          padding: '32px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          overflow: 'auto',
        }}
      >
        <h1 style={{ color: '#ff7351', fontSize: '1.4rem', marginBottom: 8 }}>
          ⚠ Ứng dụng gặp lỗi khi hiển thị
        </h1>
        {isLoop && (
          <p style={{ color: '#ffb450', marginBottom: 12 }}>
            Đây là lỗi VÒNG LẶP VÔ HẠN (re-render liên tục). Xem "Component
            Stack" bên dưới để biết component nào gây ra.
          </p>
        )}
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#1a1919',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 16,
            color: '#ff9e80',
            marginBottom: 16,
          }}
        >
          {message}
        </pre>
        {info?.componentStack && (
          <>
            <div style={{ color: '#9f9', marginBottom: 6 }}>Component stack:</div>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                background: '#1a1919',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: 16,
                color: '#bbb',
                fontSize: '0.8rem',
                marginBottom: 16,
              }}
            >
              {info.componentStack}
            </pre>
          </>
        )}
        <button
          onClick={this.handleReload}
          style={{
            background: '#9fff88',
            color: '#000',
            border: 'none',
            borderRadius: 999,
            padding: '10px 20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tải lại trang
        </button>
      </div>
    );
  }
}
