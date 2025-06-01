
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error("🚨 ErrorBoundary - Erro capturado:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 ErrorBoundary - Stack trace:", error);
    console.error("🚨 ErrorBoundary - Error info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 border border-red-300 bg-red-50 rounded">
            <h3 className="text-red-800 font-semibold">Erro de Renderização</h3>
            <p className="text-red-600 text-sm mt-1">
              {this.state.error?.message || "Erro desconhecido"}
            </p>
            <details className="mt-2">
              <summary className="text-red-700 cursor-pointer">Stack trace</summary>
              <pre className="text-xs mt-1 text-red-600 overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
