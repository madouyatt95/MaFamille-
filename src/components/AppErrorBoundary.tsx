import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  autoReloading: boolean;
};

const STALE_APP_RELOAD_KEY = 'mf_stale_app_auto_reload';

function isStaleBundleError(error: Error | null): boolean {
  const message = `${error?.name || ''} ${error?.message || ''}`.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('module script')
  );
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    autoReloading: false
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, autoReloading: false };
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MyFamily+] App crashed:', error, errorInfo);

    this.recoverIfStaleBundle(error);
  }

  private handleReload = () => {
    sessionStorage.removeItem(STALE_APP_RELOAD_KEY);
    window.location.reload();
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason || 'Unhandled promise rejection'));

    if (this.recoverIfStaleBundle(reason)) {
      event.preventDefault();
    }
  };

  private recoverIfStaleBundle = (error: Error): boolean => {
    if (isStaleBundleError(error) && sessionStorage.getItem(STALE_APP_RELOAD_KEY) !== 'true') {
      sessionStorage.setItem(STALE_APP_RELOAD_KEY, 'true');
      this.setState({ error, autoReloading: true });
      window.setTimeout(() => window.location.reload(), 600);
      return true;
    }

    sessionStorage.removeItem(STALE_APP_RELOAD_KEY);
    return false;
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[var(--family-bg)] text-[var(--family-text)] flex items-center justify-center px-5 font-sans">
        <div className="glass-panel w-full max-w-sm rounded-[30px] border border-white/10 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/25 flex items-center justify-center text-2xl">
            ✨
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold text-white">MyFamily+ doit se relancer</h1>
            <p className="text-xs text-white/55 leading-relaxed">
              Une nouvelle version vient probablement d'être installée. Relancez l'application pour repartir proprement.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="w-full py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-extrabold uppercase tracking-wider"
          >
            {this.state.autoReloading ? 'Relance en cours...' : "Relancer l'application"}
          </button>
        </div>
      </div>
    );
  }
}
