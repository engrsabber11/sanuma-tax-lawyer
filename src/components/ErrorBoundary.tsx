import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Unhandled error in app tree:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6 dark:bg-ink-950">
          <div className="w-full max-w-md rounded-2xl border border-ink-200/70 bg-white p-8 text-center shadow-[var(--shadow-card)] dark:border-ink-800 dark:bg-ink-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600 dark:bg-danger-500/15">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Something went wrong</h1>
            <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
              This screen hit an unexpected error. Reloading usually fixes it — if it keeps happening, clearing this app's saved
              data may help.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => {
                  localStorage.removeItem('sanuma-app-state-v1')
                  window.location.href = '/'
                }}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                Reset saved data
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
