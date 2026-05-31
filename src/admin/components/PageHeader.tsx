import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}

export function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="admin-eyebrow mb-1.5">{eyebrow}</div>
        ) : null}
        <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[var(--color-admin-text-strong)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--color-admin-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
