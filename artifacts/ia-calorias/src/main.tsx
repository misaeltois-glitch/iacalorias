import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./hooks/use-meal-reminders";
import { initTracking } from "./lib/tracking";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message + '\n' + (e as any).stack : String(e) };
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { padding: 24, fontFamily: 'monospace', background: '#1a1a1a', color: '#ff6b6b', minHeight: '100vh', whiteSpace: 'pre-wrap', fontSize: 13 }
      }, '❌ Erro ao carregar:\n\n' + this.state.error);
    }
    return this.props.children;
  }
}

registerServiceWorker();
initTracking();

createRoot(document.getElementById("root")!).render(
  React.createElement(ErrorBoundary, null, React.createElement(App))
);
