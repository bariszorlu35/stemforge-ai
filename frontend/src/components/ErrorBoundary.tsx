"use client";

import { Component, type ReactNode } from "react";

interface Props  { children: ReactNode }
interface State  { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    // Ignore Chrome extension errors — they're not our code
    const msg = error?.message ?? "";
    if (
      msg.includes("chrome-extension") ||
      msg.includes("read only property") ||
      msg.includes("Cannot assign to read only")
    ) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          Something went wrong. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}
