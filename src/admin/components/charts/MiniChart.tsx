/**
 * Inline SVG sparkline / area chart. Rolled by hand instead of pulling
 * in recharts/visx to keep the bundle slim (~0 added bytes vs ~110KB
 * for recharts) and to give us full control over the futuristic
 * gradient / glow styling defined in admin.css.
 *
 * Renders nothing exotic — just two paths (area fill + stroke), a
 * dotted baseline, and the last data-point dot for emphasis.
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
  /** Stroke gradient — defaults to the cyan→violet primary. */
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  /** Optional height override. */
  height?: number
  /** Show dot at the most recent point. */
  showDot?: boolean
  /** Format value labels (only used when showAxis=true). */
  formatY?: (v: number) => string
  /** Force the Y-axis max (lets multiple charts share a scale when overlaid). */
  yMax?: number
}

const VARIANT: Record<NonNullable<Props['variant']>, { from: string; to: string; glow: string }> = {
  primary: { from: '#22d3ee', to: '#a78bfa', glow: 'rgba(99,102,241,0.5)' },
  success: { from: '#34d399', to: '#22d3ee', glow: 'rgba(52,211,153,0.45)' },
  warning: { from: '#fbbf24', to: '#f97316', glow: 'rgba(251,191,36,0.45)' },
  danger:  { from: '#f87171', to: '#a855f7', glow: 'rgba(248,113,113,0.45)' },
}

export function MiniChart({
  data,
  showAxis = false,
  variant = 'primary',
  height = 80,
  showDot = true,
  formatY,
  yMax,
}: Props) {
  const palette = VARIANT[variant]
  const gid = useId().replace(/:/g, '')
  const strokeGid = `s-${gid}`
  const fillGid = `f-${gid}`

  const view = useMemo(() => {
    const width = 100
    const padTop = showAxis ? 14 : 6
    const padBot = showAxis ? 18 : 6
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
          <linearGradient id={strokeGid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
          <linearGradient id={fillGid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.from} stopOpacity="0.28" />
            <stop offset="100%" stopColor={palette.from} stopOpacity="0" />
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
                />
              )
            })}
            <text x={view.padX} y={view.padTop - 2} className="admin-chart-axis-label">
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
              d={view.line}
              stroke={`url(#${strokeGid})`}
              className="admin-chart-line"
              style={{ filter: `drop-shadow(0 0 3px ${palette.glow})` }}
            />
            {showDot && view.dot ? (
              <g className="admin-chart-dot">
                <circle cx={view.dot.x} cy={view.dot.y} r="2.6" fill={palette.from} />
                <circle cx={view.dot.x} cy={view.dot.y} r="4.5" fill={palette.from} opacity="0.18" />
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
          >
            no data yet
          </text>
        )}
      </svg>
    </div>
  )
}
