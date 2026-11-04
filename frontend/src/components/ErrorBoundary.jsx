import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <div className="min-h-[500px] w-full flex items-center justify-center p-6 bg-background">
          <div className="max-w-lg w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">error_outline</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">
              Something went wrong in this module
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              An unexpected error occurred while rendering this view. Your other tabs and Rig data remain safe.
            </p>
            {this.state.error && (
              <pre className="w-full text-left p-3 mb-6 bg-surface-container-low rounded-lg text-xs font-mono text-error overflow-x-auto max-h-36">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-bold text-sm transition-colors shadow-sm"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-colors"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
