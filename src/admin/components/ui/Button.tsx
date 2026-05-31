import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--color-admin-primary)] text-white hover:bg-[var(--color-admin-primary-hover)] shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(0,0,0,0.4)] focus-visible:outline-[var(--color-admin-primary)]',
  secondary:
    'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-text)] border border-[var(--color-admin-border-strong)] hover:bg-[var(--color-admin-surface-hover)] focus-visible:outline-[var(--color-admin-border-strong)]',
  danger:
    'bg-[var(--color-admin-danger)]/90 text-white hover:bg-[var(--color-admin-danger)] focus-visible:outline-[var(--color-admin-danger)]',
  ghost:
    'bg-transparent text-[var(--color-admin-text)] hover:bg-[var(--color-admin-surface-hover)] focus-visible:outline-[var(--color-admin-border-strong)]',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    />
  )
}
