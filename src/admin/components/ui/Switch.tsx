import { cn } from '../../lib/cn'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}

export function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
        'transition-colors duration-150 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-admin-primary)]',
        checked
          ? 'bg-[var(--color-admin-text-strong)]'
          : 'bg-[var(--color-admin-border-emphasis)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150 ease-out',
          'shadow-[0_1px_2px_rgba(15,18,22,0.18)]',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  )
}
