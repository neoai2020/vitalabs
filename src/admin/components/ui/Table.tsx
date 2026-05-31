import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table {...rest} className={cn('w-full text-sm', className)} />
    </div>
  )
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      {...rest}
      className={cn(
        'border-b border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] text-left text-xs uppercase tracking-wide text-[var(--color-admin-muted)]',
        className,
      )}
    />
  )
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...rest} className={cn('divide-y divide-[var(--color-admin-border)]', className)} />
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...rest} className={cn('transition-colors hover:bg-[var(--color-admin-surface-hover)]', className)} />
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...rest} className={cn('px-4 py-3 font-semibold', className)} />
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...rest} className={cn('px-4 py-3 align-middle text-[var(--color-admin-text)]', className)} />
}
