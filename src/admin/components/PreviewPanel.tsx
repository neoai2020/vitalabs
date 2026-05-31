import { useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

type Viewport = 'desktop' | 'mobile'

interface Props {
  title?: string
  description?: string
  /** Render-prop receives the viewport dimensions (width × height in px) the
   * preview is currently sized to, so iframes can size themselves correctly. */
  children: (vp: { viewport: Viewport; width: number; height: number }) => ReactNode
  /** Allow toggling viewport sizes. Default true. */
  viewportToggle?: boolean
  /** Default viewport. Default desktop. */
  defaultViewport?: Viewport
  className?: string
}

const SIZES: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 760 },
}

export function PreviewPanel({
  title = 'Live preview',
  description,
  children,
  viewportToggle = true,
  defaultViewport = 'desktop',
  className,
}: Props) {
  const [viewport, setViewport] = useState<Viewport>(defaultViewport)
  const { width, height } = SIZES[viewport]

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)]', className)}>
      <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-admin-text-strong)]">{title}</h3>
          {description ? <p className="mt-0.5 truncate text-xs text-[var(--color-admin-muted)]">{description}</p> : null}
        </div>
        {viewportToggle ? (
          <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)] p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={cn(
                'flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
                viewport === 'desktop'
                  ? 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-text-strong)]'
                  : 'text-[var(--color-admin-muted)] hover:text-[var(--color-admin-text)]',
              )}
              aria-label="Desktop preview"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={cn(
                'flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
                viewport === 'mobile'
                  ? 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-text-strong)]'
                  : 'text-[var(--color-admin-muted)] hover:text-[var(--color-admin-text)]',
              )}
              aria-label="Mobile preview"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              Mobile
            </button>
          </div>
        ) : null}
      </div>
      <div className="bg-[var(--color-admin-bg-soft)] p-4">
        <div className="admin-preview-frame mx-auto" style={{ width: '100%', maxWidth: width }}>
          {children({ viewport, width, height })}
        </div>
      </div>
    </div>
  )
}
