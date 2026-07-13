import { Component, ReactNode } from "react";

interface State { error: Error | null }
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "#FFD700", background: "#0a0a0a", fontFamily: "monospace", minHeight: "100vh" }}>
          <h2 style={{ color: "#ff4444" }}>Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
