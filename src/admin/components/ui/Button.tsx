import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT: Record<Variant, string> = {
  primary:   'admin-btn admin-btn--primary',
  secondary: 'admin-btn admin-btn--secondary',
  danger:    'admin-btn admin-btn--danger',
  ghost:     'admin-btn admin-btn--ghost',
}

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12.5px]',
  md: 'h-8 px-3.5 text-[13.5px]',
  lg: 'h-10 px-5 text-[14.5px]',
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: Props) {
  return <button {...rest} className={cn(VARIANT[variant], SIZE[size], className)} />
}
