/**
 * Multi-series area/line chart with real axes, dotted grid, hover
 * crosshair, and a precision tooltip. Hand-built inline SVG — no chart
 * library — so we keep the bundle thin and the look surgical.
 *
 * Compared to MiniChart (sparkline use), LineChart is meant for the
 * primary analytics surface: it always renders ticks + grid + legend
 * and supports an arbitrary number of series sharing a single Y scale.
 *
 * Coordinates are computed in pixel space (not 0–100 viewBox) so that
 * tick labels, dots, and the crosshair line up exactly with the
 * underlying paths regardless of container width. The SVG is sized via
 * a `ResizeObserver` on the wrapping `<div>`.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { ChartPoint } from './MiniChart'

export type SeriesVariant = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

export interface Series {
  id: string
  label: string
  data: ChartPoint[]
  variant?: SeriesVariant
  /** When true the area beneath the line is filled with a soft tint. */
  fill?: boolean
}

interface Props {
  series: Series[]
  height?: number
  /** Format a value for the y-axis and tooltip. */
  formatY?: (v: number) => string
  /** Format the x-axis tick label from a series point's `label`. */
  formatX?: (label: string) => string
  /** Format the tooltip header (date row). Defaults to formatX. */
  formatTooltipLabel?: (label: string) => string
  /** Show / hide the legend strip above the chart. */
  showLegend?: boolean
  /** Optional empty-state copy. */
  emptyMessage?: string
}

const STROKE: Record<SeriesVariant, string> = {
  primary: 'var(--color-admin-primary)',
  success: 'var(--color-admin-success)',
  warning: 'var(--color-admin-warning)',
  danger:  'var(--color-admin-danger)',
  muted:   'var(--color-admin-subtle)',
}

const FILL_OPACITY = 0.14

/** Format an ISO date (YYYY-MM-DD) into a short tick label like "Mon 17". */
function defaultFormatX(label: string): string {
  // Only parse if it actually looks like a date — otherwise pass through.
  if (!/^\d{4}-\d{2}-\d{2}/.test(label)) return label
  const d = new Date(label)
  if (Number.isNaN(d.getTime())) return label
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
}

function defaultFormatTooltipLabel(label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(label)) return label
  const d = new Date(label)
  if (Number.isNaN(d.getTime())) return label
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Nice rounded max for axis labels (e.g. 387 → 400, 12 → 15).
 * Always returns >= 1 so the chart never collapses to a flat line.
 */
function niceMax(raw: number): number {
  if (raw <= 1) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / pow
  let step: number
  if (n <= 1.5) step = 1.5
  else if (n <= 2) step = 2
  else if (n <= 3) step = 3
  else if (n <= 5) step = 5
  else if (n <= 7.5) step = 7.5
  else step = 10
  return step * pow
}

/** Pick a subset of indices to label on the X axis (~ every Nth). */
function pickTickIndices(count: number, target = 6): number[] {
  if (count <= target) return Array.from({ length: count }, (_, i) => i)
  const stride = Math.max(1, Math.round((count - 1) / (target - 1)))
  const out: number[] = []
  for (let i = 0; i < count; i += stride) out.push(i)
  if (out[out.length - 1] !== count - 1) out.push(count - 1)
  return out
}

export function LineChart({
  series,
  height = 260,
  formatY,
  formatX = defaultFormatX,
  formatTooltipLabel,
  showLegend = true,
  emptyMessage = 'No data yet for this range.',
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')
  const fmtY = formatY ?? ((n: number) => Math.round(n).toLocaleString())
  const fmtTip = formatTooltipLabel ?? defaultFormatTooltipLabel

  // ResizeObserver keeps the SVG width accurate without forcing a fixed
  // viewBox. This is what lets the tick labels line up with the paths.
  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Find the longest series to define the canonical X axis. All other
  // series are assumed to share the same index → label mapping (the
  // dashboard guarantees this; if not, points beyond the longest series
  // simply won't render).
  const canonical = series.reduce<ChartPoint[]>((acc, s) => (s.data.length > acc.length ? s.data : acc), [])

  // Geometry — pad enough room for left y-tick labels (~40px) and a 22px x-axis strip.
  const padLeft = 40
  const padRight = 12
  const padTop = 12
  const padBot = 26
  const hAvail = Math.max(0, height - padTop - padBot)
  const wAvail = Math.max(0, width - padLeft - padRight)

  const max = useMemo(() => {
    const all = series.flatMap(s => s.data.map(p => p.value))
    return niceMax(Math.max(...all, 1))
  }, [series])

  const xTickIdx = useMemo(() => pickTickIndices(canonical.length), [canonical.length])

  const isEmpty = canonical.length === 0 || series.every(s => s.data.every(p => p.value === 0))

  const xForIdx = (i: number) => {
    if (canonical.length <= 1) return padLeft
    return padLeft + (i / (canonical.length - 1)) * wAvail
  }
  const yForValue = (v: number) => padTop + hAvail * (1 - v / max)

  // 5 horizontal grid lines + corresponding y-tick labels (top, ¾, ½, ¼, baseline).
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: padTop + hAvail * (1 - t),
    value: max * t,
  }))

  // Hover handling: convert mouse X to the nearest canonical index.
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (canonical.length === 0 || wAvail === 0) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const x = e.clientX - rect.left - padLeft
    const ratio = Math.max(0, Math.min(1, x / wAvail))
    const idx = Math.round(ratio * (canonical.length - 1))
    setHoverIdx(idx)
  }
  const onMouseLeave = () => setHoverIdx(null)

  // Tooltip placement: keep it inside the chart bounds horizontally.
  const tooltipStyle: CSSProperties | undefined = (() => {
    if (hoverIdx === null) return undefined
    const x = xForIdx(hoverIdx)
    return {
      left: Math.max(80, Math.min(width - 80, x)),
      top: padTop + 4,
    }
  })()

  return (
    <div className="relative w-full" ref={wrapRef} style={{ height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          role="img"
        >
          <defs>
            {series.map(s => (
              <linearGradient key={s.id} id={`lc-fill-${gid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={STROKE[s.variant ?? 'primary']} stopOpacity={FILL_OPACITY} />
                <stop offset="100%" stopColor={STROKE[s.variant ?? 'primary']} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal grid + y-axis tick labels */}
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={t.y}
                y2={t.y}
                className={`admin-chart-grid${i === yTicks.length - 1 ? ' admin-chart-grid--baseline' : ''}`}
                strokeDasharray={i === yTicks.length - 1 ? undefined : '2 4'}
              />
              <text
                x={padLeft - 8}
                y={t.y + 3}
                textAnchor="end"
                className="admin-chart-tick"
              >
                {fmtY(t.value)}
              </text>
            </g>
          ))}

          {/* X-axis tick labels */}
          {!isEmpty
            ? xTickIdx.map(i => (
                <text
                  key={`xt-${i}`}
                  x={xForIdx(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="admin-chart-tick"
                >
                  {formatX(canonical[i]?.label ?? '')}
                </text>
              ))
            : null}

          {/* Series — area fill (if requested) + stroke + draw-in animation */}
          {!isEmpty
            ? series.map(s => {
                const variant = s.variant ?? 'primary'
                const color = STROKE[variant]
                const pts = s.data.map((p, i) => ({ x: xForIdx(i), y: yForValue(p.value) }))
                if (pts.length === 0) return null
                const line = pts
                  .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                  .join(' ')
                const last = pts[pts.length - 1]
                const first = pts[0]
                const area = `${line} L ${last.x} ${padTop + hAvail} L ${first.x} ${padTop + hAvail} Z`
                const drawKey = `${s.id}|${s.data.length}|${s.data[0]?.value ?? 0}|${last.y.toFixed(0)}`
                return (
                  <g key={s.id}>
                    {s.fill ? <path d={area} fill={`url(#lc-fill-${gid}-${s.id})`} /> : null}
                    <path
                      key={drawKey}
                      d={line}
                      stroke={color}
                      className="admin-chart-line admin-chart-line--draw"
                    />
                  </g>
                )
              })
            : null}

          {/* Crosshair + hover dots */}
          {hoverIdx !== null && !isEmpty ? (
            <g>
              <line
                x1={xForIdx(hoverIdx)}
                x2={xForIdx(hoverIdx)}
                y1={padTop}
                y2={padTop + hAvail}
                className="admin-chart-crosshair"
              />
              {series.map(s => {
                const point = s.data[hoverIdx]
                if (!point) return null
                const color = STROKE[s.variant ?? 'primary']
                return (
                  <g key={`hd-${s.id}`}>
                    <circle
                      cx={xForIdx(hoverIdx)}
                      cy={yForValue(point.value)}
                      r="3.6"
                      fill="var(--color-admin-bg)"
                      stroke={color}
                      strokeWidth="1.5"
                    />
                  </g>
                )
              })}
            </g>
          ) : null}

          {/* Empty state */}
          {isEmpty ? (
            <text
              x={width / 2}
              y={padTop + hAvail / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="admin-chart-tick"
              fill="var(--color-admin-subtle)"
            >
              {emptyMessage}
            </text>
          ) : null}
        </svg>
      ) : null}

      {/* Tooltip */}
      {hoverIdx !== null && !isEmpty && tooltipStyle ? (
        <div className="admin-chart-tooltip" style={tooltipStyle}>
          <div className="admin-chart-tooltip-label">
            {fmtTip(canonical[hoverIdx]?.label ?? '')}
          </div>
          {series.map(s => {
            const point = s.data[hoverIdx]
            if (!point) return null
            const color = STROKE[s.variant ?? 'primary']
            return (
              <div key={`tt-${s.id}`} className="admin-chart-tooltip-row">
                <span className="admin-chart-tooltip-swatch" style={{ background: color }} />
                <span className="admin-chart-tooltip-series">{s.label}</span>
                <span className="admin-chart-tooltip-value">{fmtY(point.value)}</span>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Legend strip (above chart) */}
      {showLegend ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-4 px-2 pt-1">
          {series.map(s => (
            <span
              key={`lg-${s.id}`}
              className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-admin-muted)]"
            >
              <span
                className="inline-block h-[2px] w-3 rounded-full"
                style={{ background: STROKE[s.variant ?? 'primary'] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
