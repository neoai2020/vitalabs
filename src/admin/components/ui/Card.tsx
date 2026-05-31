import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Card is the default container for a coherent unit (table, form, settings
 * panel). Inside a card, use CardHeader → CardBody → CardFooter for the
 * standard rhythm. Cards are *quiet* — a hairline border, a soft 1px shadow,
 * and a 1-tone surface change on hover. No gradient borders or glow.
 */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn('admin-card', className)} />
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-admin-border)] px-6 py-4">
      <div className="min-w-0">
        {eyebrow ? <div className="admin-eyebrow mb-1">{eyebrow}</div> : null}
        <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--color-admin-text-strong)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-admin-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn('px-6 py-5', className)} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'flex items-center justify-end gap-2 border-t border-[var(--color-admin-border)] bg-[var(--color-admin-surface-sunken)] px-6 py-3.5',
        className,
      )}
    />
  )
}
