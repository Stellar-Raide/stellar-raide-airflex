"use client";

import React from "react";
import { reportError, type ErrorContext } from "../app/lib/monitoring";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: ErrorContext;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportError(error, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
      source: "component-error-boundary",
    });
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center shadow-sm sm:p-8 dark:border-red-900/50 dark:bg-red-950/20"
        >
          <span aria-hidden="true" className="text-3xl sm:text-4xl">
            ⚡
          </span>

          <h3 className="mt-3 text-base font-bold text-gray-900 sm:text-lg dark:text-gray-100">
            Something went wrong
          </h3>

          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-gray-600 sm:text-sm dark:text-gray-400">
            An unexpected error occurred in this section. You can try again to recover without a full page reload.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 sm:text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
