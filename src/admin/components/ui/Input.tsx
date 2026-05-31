import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn('admin-field h-9', className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn('admin-field min-h-[88px] py-2', className)} />
}

/**
 * Select with the same hairline / focus treatment as Input. A custom chevron
 * via background-image so the native browser arrow doesn't pop in. Used
 * across pages instead of ad-hoc inline-styled <select> elements.
 */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        'admin-field h-9 appearance-none bg-no-repeat pr-9',
        className,
      )}
      style={{
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%236a727d%22 stroke-width=%221.6%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M4 6l4 4 4-4%22/></svg>")',
        backgroundPosition: 'right 10px center',
        backgroundSize: '14px',
      }}
    >
      {children}
    </select>
  )
}
