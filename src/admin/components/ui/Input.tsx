import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const BASE = 'w-full rounded-md border border-[var(--color-admin-border)] bg-white px-3 py-2 text-sm text-[var(--color-admin-text)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-primary)] focus:border-transparent disabled:opacity-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(BASE, 'h-10', className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(BASE, 'min-h-[80px]', className)} />
}
