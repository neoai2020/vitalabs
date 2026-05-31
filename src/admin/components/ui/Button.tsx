import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[var(--color-admin-primary)] text-white hover:bg-[var(--color-admin-primary-hover)] focus-visible:outline-[var(--color-admin-primary)]',
  secondary: 'bg-white text-[var(--color-admin-text)] border border-[var(--color-admin-border)] hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-[var(--color-admin-danger)] text-white hover:bg-red-700 focus-visible:outline-red-500',
  ghost: 'bg-transparent text-[var(--color-admin-text)] hover:bg-slate-100 focus-visible:outline-slate-400',
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
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    />
  )
}
