import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  hint?: ReactNode
}

export function Label({ children, hint, className, ...rest }: Props) {
  return (
    <label {...rest} className={cn('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-medium text-[var(--color-admin-text)]">{children}</span>
      {hint ? <span className="text-xs text-[var(--color-admin-muted)]">{hint}</span> : null}
    </label>
  )
}
