import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches render-time exceptions inside the admin tree so one broken
 * page doesn't take the entire panel down. Logs to console; surfaces
 * a "Reload" button and the error message.
 */
export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[admin] uncaught error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="admin-root flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md rounded-xl border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] p-6 shadow-2xl">
            <h1 className="text-lg font-semibold text-[var(--color-admin-text-strong)]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--color-admin-muted)]">
              The admin panel hit an unexpected error. The rest of the site is
              not affected. Reload the page or pick a different section from
              the sidebar.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3 text-xs text-[var(--color-admin-danger)]">
              {this.state.error.message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={this.reset}
                className="rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface-elevated)] px-4 py-2 text-sm text-[var(--color-admin-text)] hover:bg-[var(--color-admin-surface-hover)]"
              >Try again</button>
              <a
                href="/admin"
                className="rounded-md bg-[var(--color-admin-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-admin-primary-hover)]"
              >Go to dashboard</a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
