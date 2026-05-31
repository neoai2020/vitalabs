import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface Props {
  tone?: StatusTone
  children: ReactNode
  className?: string
}

/**
 * Pill with a tiny solid status dot prefixed via CSS. Used everywhere we
 * want to render a status: order state, campaign state, product active/
 * draft/archived, etc. Stays restrained — coloured dot + soft tinted
 * background, never a saturated solid fill.
 */
export function StatusPill({ tone = 'neutral', children, className }: Props) {
  return (
    <span className={cn('admin-pill', `admin-pill--${tone}`, className)}>
      {children}
    </span>
  )
}
