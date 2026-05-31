/**
 * Inline SVG sparkline / area chart. Rolled by hand instead of pulling
 * in recharts/visx to keep the bundle slim (~0 added bytes vs ~110KB
 * for recharts) and to give us total control over the restrained
 * style defined in admin.css.
 *
 * Renders nothing exotic — a soft area fill, a single-color line, and
 * an optional dot on the last point. On mount the line draws in via
 * stroke-dashoffset (one of three signature motions for the panel).
 */
import { useMemo, useId } from 'react'

export interface ChartPoint {
  /** ISO date or label for the X-axis (used for tooltips/keys). */
  label: string
  value: number
}

interface Props {
  data: ChartPoint[]
  /** Show grid lines + min/max labels. Default false for sparkline use. */
  showAxis?: boolean
  /** Stroke tone — defaults to the sage-teal primary. */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted'
  /** Optional height override. */
  height?: number
  /** Show dot at the most recent point. */
  showDot?: boolean
  /** Format value labels (only used when showAxis=true). */
  formatY?: (v: number) => string
  /** Force the Y-axis max (lets multiple charts share a scale when overlaid). */
  yMax?: number
  /** Re-trigger the draw-in animation when this key changes. */
  animateKey?: string | number
}

const STROKES: Record<NonNullable<Props['variant']>, string> = {
  primary: 'var(--color-admin-primary)',
  success: 'var(--color-admin-success)',
  warning: 'var(--color-admin-warning)',
  danger:  'var(--color-admin-danger)',
  muted:   'var(--color-admin-subtle)',
}

const FILLS: Record<NonNullable<Props['variant']>, string> = {
  primary: 'var(--color-admin-primary-soft)',
  success: 'var(--color-admin-success-soft)',
  warning: 'var(--color-admin-warning-soft)',
  danger:  'var(--color-admin-danger-soft)',
  muted:   'var(--color-admin-surface-sunken)',
}

export function MiniChart({
  data,
  showAxis = false,
  variant = 'primary',
  height = 80,
  showDot = true,
  formatY,
  yMax,
  animateKey,
}: Props) {
  const stroke = STROKES[variant]
  const fill = FILLS[variant]
  const gid = useId().replace(/:/g, '')
  const fillGid = `f-${gid}`

  // Re-trigger the draw-in animation by remounting the path whenever its
  // shape changes. Cheap: a stable string of first/last/length + caller key
  // is enough, since we don't care about reanimating on within-series tweaks.
  const drawKey = `${animateKey ?? ''}|${data.length}|${data[0]?.value ?? 0}|${data[data.length - 1]?.value ?? 0}`

  const view = useMemo(() => {
    const width = 100
    const padTop = showAxis ? 16 : 4
    const padBot = showAxis ? 18 : 4
    const padX = 2
    const hAvail = height - padTop - padBot

    if (data.length === 0) {
      return { width, height, padTop, padBot, padX, hAvail, line: '', area: '', dot: null as null | { x: number; y: number }, min: 0, max: 0 }
    }

    const dataMax = Math.max(...data.map(d => d.value), 1)
    const max = yMax ?? dataMax
    const min = Math.min(...data.map(d => d.value), 0)
    const range = max - min || 1
    const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0

    const pts = data.map((d, i) => {
      const x = padX + i * step
      const y = padTop + hAvail * (1 - (d.value - min) / range)
      return { x, y }
    })

    const line = pts
      .map((p, i) => (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`))
      .join(' ')

    const last = pts[pts.length - 1]
    const first = pts[0]
    const area = `${line} L ${last.x.toFixed(2)} ${(padTop + hAvail).toFixed(2)} L ${first.x.toFixed(2)} ${(padTop + hAvail).toFixed(2)} Z`

    return { width, height, padTop, padBot, padX, hAvail, line, area, dot: last, min, max }
  }, [data, height, showAxis, yMax])

  const isEmpty = data.length === 0 || data.every(d => d.value === 0)

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        aria-hidden
      >
        <defs>
          <linearGradient id={fillGid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + axis labels (axis-mode only) */}
        {showAxis ? (
          <>
            {[0.25, 0.5, 0.75].map(t => {
              const y = view.padTop + view.hAvail * t
              return (
                <line
                  key={t}
                  x1={view.padX}
                  x2={100 - view.padX}
                  y1={y}
                  y2={y}
                  className="admin-chart-grid"
                  strokeDasharray="2 4"
                />
              )
            })}
            <text x={view.padX} y={view.padTop - 4} className="admin-chart-axis-label">
              {formatY ? formatY(view.max) : Math.round(view.max)}
            </text>
            <text x={view.padX} y={view.padTop + view.hAvail + 12} className="admin-chart-axis-label">
              {formatY ? formatY(view.min) : Math.round(view.min)}
            </text>
          </>
        ) : null}

        {!isEmpty && view.line ? (
          <>
            <path d={view.area} fill={`url(#${fillGid})`} />
            <path
              key={drawKey}
              d={view.line}
              stroke={stroke}
              className="admin-chart-line admin-chart-line--draw"
            />
            {showDot && view.dot ? (
              <g className="admin-chart-dot">
                <circle cx={view.dot.x} cy={view.dot.y} r="2.4" fill={stroke} />
              </g>
            ) : null}
          </>
        ) : (
          <text
            x="50"
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="admin-chart-axis-label"
            fill={fill}
          >
            no data yet
          </text>
        )}
      </svg>
    </div>
  )
}
