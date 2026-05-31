import type { ReactNode } from 'react'
import { MiniChart, type ChartPoint } from './MiniChart'

interface Props {
  label: string
  value: string
  /** Sublabel — usually period or breakdown. */
  hint?: string
  /** Percentage delta vs previous period. Positive = good unless `goodWhenDown`. */
  deltaPct?: number | null
  /** Some metrics (abandonment, errors) are good when they go down. */
  goodWhenDown?: boolean
  /** Sparkline data. */
  data: ChartPoint[]
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  /** Optional accent label / icon shown in top-right. */
  badge?: ReactNode
  loading?: boolean
}

function DeltaBadge({ deltaPct, goodWhenDown }: { deltaPct: number; goodWhenDown?: boolean }) {
  const up = deltaPct >= 0
  const good = goodWhenDown ? !up : up
  const cls = good
    ? 'text-[var(--color-admin-success)] bg-[var(--color-admin-success-soft)]'
    : 'text-[var(--color-admin-danger)] bg-[var(--color-admin-danger-soft)]'
  const arrow = up ? '▲' : '▼'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${cls}`}>
      <span>{arrow}</span>
      <span>{Math.abs(deltaPct).toFixed(1)}%</span>
    </span>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  deltaPct,
  goodWhenDown,
  data,
  variant = 'primary',
  badge,
  loading,
}: Props) {
  return (
    <div className="admin-kpi p-5">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-admin-muted)]">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="admin-kpi-value text-3xl font-semibold">
              {loading ? '…' : value}
            </span>
            {deltaPct !== null && deltaPct !== undefined && !loading
              ? <DeltaBadge deltaPct={deltaPct} goodWhenDown={goodWhenDown} />
              : null}
          </div>
          {hint ? <div className="mt-1 text-xs text-[var(--color-admin-muted)]">{hint}</div> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div className="relative z-10 mt-4">
        <MiniChart data={data} variant={variant} height={64} showDot />
      </div>
    </div>
  )
}
