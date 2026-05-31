import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  hint?: ReactNode
}

export function Label({ children, hint, className, ...rest }: Props) {
  return (
    <label {...rest} className={cn('flex flex-col gap-1.5 text-[13px]', className)}>
      <span className="font-medium text-[var(--color-admin-text-strong)]">{children}</span>
      {hint ? <span className="text-[12px] leading-relaxed text-[var(--color-admin-muted)]">{hint}</span> : null}
    </label>
  )
}
