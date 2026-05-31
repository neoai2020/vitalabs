import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-lg border border-[var(--color-admin-border)] bg-white shadow-sm',
        className,
      )}
    />
  )
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-admin-border)] px-6 py-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-admin-text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--color-admin-muted)]">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
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
      className={cn('flex items-center justify-end gap-2 border-t border-[var(--color-admin-border)] px-6 py-4', className)}
    />
  )
}
