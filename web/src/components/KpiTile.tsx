import { useId } from 'react'
import { Card } from './Card'
import { cx } from './cx'
import './KpiTile.css'

export interface KpiDelta {
  /** "2.1 pts vs last week" — the arrow is added from `trend`. */
  label: string
  trend: 'up' | 'down' | 'flat'
  /** Whether the move is good news. Defaults to up = positive, down = negative. */
  tone?: 'positive' | 'negative' | 'neutral'
}

/** Which hue the sparkline takes. Teal is the default "progress" colour from the brief. */
export type KpiAccent = 'teal' | 'success' | 'info' | 'danger' | 'warning' | 'saffron'

export interface KpiTileProps {
  label: string
  value: string
  delta?: KpiDelta
  /** Recent values, oldest first. Two or more points draw a sparkline. */
  sparkline?: number[]
  accent?: KpiAccent
  className?: string
}

const ARROW: Record<KpiDelta['trend'], string> = { up: '▲', down: '▼', flat: '●' }
const DEFAULT_TONE: Record<KpiDelta['trend'], NonNullable<KpiDelta['tone']>> = {
  up: 'positive',
  down: 'negative',
  flat: 'neutral',
}

/**
 * Big number with a small-caps label and a signal-coloured delta line on the left,
 * and an optional sparkline on the right.
 */
export function KpiTile({ label, value, delta, sparkline, accent = 'teal', className }: KpiTileProps) {
  const tone = delta ? delta.tone ?? DEFAULT_TONE[delta.trend] : undefined
  const hasSpark = !!sparkline && sparkline.length >= 2
  return (
    <Card className={cx('pt-kpi', `pt-kpi--${accent}`, hasSpark && 'pt-kpi--with-spark', className)}>
      <span className="pt-kpi__label">{label}</span>
      <strong className="pt-kpi__value">{value}</strong>
      {delta && (
        <span className={cx('pt-kpi__delta', `pt-kpi__delta--${tone}`)}>
          <span aria-hidden="true">{ARROW[delta.trend]} </span>
          <span className="pt-sr-only">{delta.trend === 'flat' ? 'Unchanged, ' : delta.trend === 'up' ? 'Up ' : 'Down '}</span>
          {delta.label}
        </span>
      )}
      {hasSpark && <Sparkline points={sparkline} label={label} />}
    </Card>
  )
}

export interface SparklineProps {
  points: number[]
  /** What the series is, for the accessible description. */
  label: string
  className?: string
}

const W = 100
const H = 32
const PAD = 2

/** Single-series trend line: 2 px stroke in the tile's accent over a soft gradient fill, no axes. */
export function Sparkline({ points, label, className }: SparklineProps) {
  const gradientId = useId()
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => [PAD + i * step, PAD + (1 - (p - min) / range) * (H - PAD * 2)] as const)
  const line = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} ${(PAD + (points.length - 1) * step).toFixed(2)},${H} ${PAD},${H}`
  const first = points[0]
  const last = points[points.length - 1]
  const description = `${label} trend over ${points.length} points, from ${first} to ${last}`

  return (
    <svg
      className={cx('pt-sparkline', className)}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={description}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
