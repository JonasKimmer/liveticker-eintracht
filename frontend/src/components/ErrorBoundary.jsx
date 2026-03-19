import React from "react";

/**
 * ErrorBoundary
 * =============
 * Fängt JavaScript-Fehler in untergeordneten Komponenten ab und zeigt
 * eine Fallback-UI an, anstatt den gesamten Komponentenbaum zu crashen.
 *
 * Verwendung:
 *   <ErrorBoundary fallback={<p>Fehler in diesem Bereich.</p>}>
 *     <MeineKomponente />
 *   </ErrorBoundary>
 *
 * Ohne `fallback`-Prop wird eine Standard-Fehlermeldung angezeigt.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "16px",
            background: "#1a1a1a",
            border: "1px solid #3a2a2a",
            borderRadius: "8px",
            color: "#e0e0e0",
            textAlign: "center",
          }}
        >
          <p style={{ marginBottom: "8px", color: "#ff6b6b" }}>
            ⚠ Fehler in diesem Bereich
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "4px 12px",
              background: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#e0e0e0",
              cursor: "pointer",
            }}
          >
            Neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
