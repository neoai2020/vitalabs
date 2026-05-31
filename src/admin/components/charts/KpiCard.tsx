import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  /** Stagger index — controls the cascade reveal animation. */
  index?: number
  /** Format raw values for the min/avg/peak breakdown footer (e.g. percentages). */
  formatBreakdown?: (n: number) => string
  /** Hide the min/avg/peak footer (use for very dense layouts). */
  hideBreakdown?: boolean
}

/** Compact number formatter for breakdown stats: 1.2k / 14.3M / 42.1%. */
function compactNumber(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  if (abs >= 10 || Number.isInteger(n)) return Math.round(n).toLocaleString()
  return n.toFixed(1)
}

/**
 * Parse a display string like "1,234" / "42%" / "£18.40" into { prefix, num, suffix }
 * so we can animate the numeric portion only. Returns null when there's no number
 * to animate (e.g. "—").
 */
function parseDisplay(value: string): { prefix: string; num: number; decimals: number; suffix: string } | null {
  const match = value.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  const numStr = match[2].replace(/,/g, '')
  const num = Number(numStr)
  if (!Number.isFinite(num)) return null
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0
  return { prefix: match[1], num, decimals, suffix: match[3] }
}

/**
 * Count-up animation. Animates from 0 → target over `duration` ms using
 * easeOutCubic, then snaps to the exact source string so we never show
 * a rounded-off final value. Falls back to the raw string if parsing fails
 * or `prefers-reduced-motion` is set.
 *
 * All state updates happen inside `requestAnimationFrame` so we never
 * cascade-render synchronously from the effect body.
 */
function useCountUp(value: string, duration = 900): string {
  const parsed = useMemo(() => parseDisplay(value), [value])
  const reduce = useMemo(() => (
    typeof window !== 'undefined'
      && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ), [])

  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (!parsed || reduce) {
      // No animation needed — defer the update via microtask so we
      // never call setState synchronously inside the effect body.
      let cancelled = false
      queueMicrotask(() => { if (!cancelled) setDisplay(value) })
      return () => { cancelled = true }
    }

    let raf = 0
    const start = performance.now()
    const to = parsed.num

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = to * eased
      const formatted = current.toLocaleString(undefined, {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
      })
      setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        // Snap to exact source so no rounding artefact remains.
        setDisplay(value)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [parsed, reduce, duration, value])

  return display
}

function DeltaBadge({ deltaPct, goodWhenDown }: { deltaPct: number; goodWhenDown?: boolean }) {
  const up = deltaPct >= 0
  const good = goodWhenDown ? !up : up
  const cls = good
    ? 'text-[var(--color-admin-success)]'
    : 'text-[var(--color-admin-danger)]'
  const arrow = up ? '↑' : '↓'
  return (
    <span className={`admin-mono inline-flex items-center gap-0.5 text-[11px] font-medium ${cls}`}>
      <span aria-hidden>{arrow}</span>
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
  index = 0,
  formatBreakdown,
  hideBreakdown,
}: Props) {
  const animated = useCountUp(loading ? '—' : value)
  const display = loading ? '—' : animated
  const fmt = formatBreakdown ?? compactNumber

  // Derive min / avg / peak for the breakdown footer. Skip zero-only series
  // so empty metrics don't render a misleading "0 · 0 · 0" strip.
  const stats = useMemo(() => {
    if (!data.length) return null
    const values = data.map(d => d.value)
    const hasAny = values.some(v => v > 0)
    if (!hasAny) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return { min, avg, max }
  }, [data])

  return (
    <div
      className="admin-kpi admin-stagger p-5"
      style={{ ['--admin-stagger' as never]: String(index) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="admin-eyebrow">{label}</div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="admin-kpi-value text-[28px] font-semibold leading-none tracking-[-0.02em]">
              {display}
            </span>
            {deltaPct !== null && deltaPct !== undefined && !loading
              ? <DeltaBadge deltaPct={deltaPct} goodWhenDown={goodWhenDown} />
              : null}
          </div>
          {hint
            ? <div className="mt-1.5 text-[12px] text-[var(--color-admin-muted)]">{hint}</div>
            : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div className="mt-4 -mx-1">
        <MiniChart data={data} variant={variant} height={48} showDot animateKey={value} />
      </div>

      {!hideBreakdown && stats ? (
        <div className="admin-kpi-breakdown">
          <div>
            <span className="admin-kpi-breakdown-label">Min</span>
            <span className="admin-kpi-breakdown-value">{fmt(stats.min)}</span>
          </div>
          <div>
            <span className="admin-kpi-breakdown-label">Avg</span>
            <span className="admin-kpi-breakdown-value">{fmt(stats.avg)}</span>
          </div>
          <div>
            <span className="admin-kpi-breakdown-label">Peak</span>
            <span className="admin-kpi-breakdown-value">{fmt(stats.max)}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
