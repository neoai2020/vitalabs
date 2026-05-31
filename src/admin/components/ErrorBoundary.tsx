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
          <div className="admin-card max-w-md p-6">
            <div className="admin-eyebrow text-[var(--color-admin-danger)]">Error</div>
            <h1 className="mt-2 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-admin-text-strong)]">
              Something went wrong
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-admin-muted)]">
              This page hit an unexpected error. The rest of the admin is unaffected — try again or jump back to the dashboard.
            </p>
            <pre className="admin-mono mt-3 overflow-x-auto rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-sunken)] p-3 text-[12px] text-[var(--color-admin-danger)]">
              {this.state.error.message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={this.reset}
                className="admin-btn admin-btn--secondary h-8 px-3.5"
              >Try again</button>
              <a
                href="/admin"
                className="admin-btn admin-btn--primary h-8 px-3.5"
              >Go to dashboard</a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
