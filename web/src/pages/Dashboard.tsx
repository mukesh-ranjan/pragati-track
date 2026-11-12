import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listShipments, type ShipmentSummary } from '../api'
import {
  API_STATUS_PILL,
  Button,
  Card,
  DataRow,
  KpiTile,
  NetworkMap,
  PILL_STATUSES,
  Sidebar,
  StatusPill,
  ThemeToggle,
  type PillStatus,
  type PillTone,
} from '../components'
import {
  ATTENTION_NOTES,
  COST_PER_ROUTE,
  DELIVERIES_14D,
  KPIS,
  LATE_REASONS,
  LATE_TOTAL,
  NETWORK,
  OPERATOR,
  type KpiSeed,
} from '../data/seed'
import { count, inr, percent } from '../format'
import { useCountUp } from '../hooks/useCountUp'
import { NAV } from '../nav'
import './dashboard.css'

/** Sort key: the worse the tone, the higher in the list. */
const TONE_RANK: Record<PillTone, number> = { danger: 0, warning: 1, info: 2, success: 3 }

interface AttentionRow {
  id: string
  route: string
  progress: number
  status: PillStatus
  label?: string
}

function toAttentionRow(s: ShipmentSummary): AttentionRow {
  const note = ATTENTION_NOTES[s.tracking_id]
  return {
    id: s.tracking_id,
    route: `${s.origin} → ${s.destination}`,
    progress: note?.progress ?? (s.status === 'delivered' ? 100 : 50),
    status: note?.status ?? API_STATUS_PILL[s.status],
    label: note?.label,
  }
}

function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const HEADER_DATE = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

const TOOLTIP_STYLE = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-sans)',
  padding: '8px 12px',
}
/* Ticks are text: muted (>= 4.5:1 on both surfaces), not faint (3.2:1 in light). */
const TICK_STYLE = { fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }
/* Tooltip rows default to the series colour, which is a mark colour, not a text colour. */
const TOOLTIP_ITEM_STYLE = { color: 'var(--color-text)' }
const TOOLTIP_LABEL_STYLE = { color: 'var(--color-text-muted)', marginBottom: 4 }

/* ---------- KPI ---------- */

const KPI_FORMAT: Record<KpiSeed['format'], (v: number) => string> = {
  percent: v => percent(v),
  count: v => count(v),
  inr: v => inr(v),
}

/** One seeded KPI, counting up from zero on mount (jumps straight there under reduced motion). */
function AnimatedKpi({ kpi }: { kpi: KpiSeed }) {
  const shown = useCountUp(kpi.value)
  return (
    <KpiTile
      label={kpi.label}
      value={KPI_FORMAT[kpi.format](shown)}
      delta={kpi.delta}
      sparkline={kpi.sparkline}
      accent={kpi.accent}
    />
  )
}

/* ---------- Charts ---------- */

type LegendItem = { name: string; color: string }

function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={`db-legend ${className ?? ''}`}>
      {items.map(i => (
        <li key={i.name}>
          <span className="db-legend__swatch" style={{ background: i.color }} aria-hidden="true" />
          <span className="db-legend__name">{i.name}</span>
        </li>
      ))}
    </ul>
  )
}

const DELIVERY_SERIES: LegendItem[] = [
  { name: 'On time', color: 'var(--chart-on-time)' },
  { name: 'Late', color: 'var(--chart-late)' },
]

/**
 * Background shape for each cost-per-route bar. Recharts hands it the full band
 * width, so it draws the route name top-left, the ₹ value top-right and a track.
 */
function RouteTrack(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props
  const d = COST_PER_ROUTE[index]
  if (!d) return null
  const labelY = y - 8
  return (
    <g>
      <text x={x} y={labelY} fill="var(--color-text)" fontSize={13} fontWeight={500} fontFamily="var(--font-sans)">
        {d.route}
      </text>
      <text
        x={x + width}
        y={labelY}
        textAnchor="end"
        fill="var(--color-text)"
        fontSize={13}
        fontWeight={700}
        fontFamily="var(--font-mono)"
      >
        {inr(d.costPerKg, 1)}
      </text>
      <rect x={x} y={y} width={width} height={height} rx={height / 2} fill="var(--color-surface-sunken)" />
    </g>
  )
}

/* ---------- Page ---------- */

type LoadState = 'loading' | 'error' | 'ready'

export default function Dashboard() {
  const [shipments, setShipments] = useState<ShipmentSummary[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const now = useMemo(() => new Date(), [])

  const load = useCallback(() => {
    setState('loading')
    setError('')
    listShipments()
      .then(rows => {
        setShipments(rows)
        setState('ready')
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : String(e))
        setState('error')
      })
  }, [])

  useEffect(load, [load])

  const attention = useMemo(
    () =>
      shipments
        .map(toAttentionRow)
        .sort((a, b) => TONE_RANK[PILL_STATUSES[a.status].tone] - TONE_RANK[PILL_STATUSES[b.status].tone]),
    [shipments],
  )

  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () => (q ? attention.filter(r => r.id.toLowerCase().includes(q) || r.route.toLowerCase().includes(q)) : attention),
    [attention, q],
  )

  const deliveries = useMemo(() => DELIVERIES_14D.map(d => ({ ...d, day: DAY_LABEL.format(new Date(d.date)) })), [])

  return (
    <div className="db">
      <Sidebar
        items={NAV}
        footer={
          <>
            <strong>Pragati Logistics</strong>
            {NETWORK.hubs} hubs · {NETWORK.trucksOnRoad} trucks on road
            <br />
            Data: fictional demo seed
          </>
        }
      />

      <main className="db-main">
        <header className="db-header">
          <div>
            <h1 className="db-title">
              {greeting(now)}, {OPERATOR.name}
              <span className="db-live">
                <span className="db-live__dot" aria-hidden="true" />
                Live
              </span>
            </h1>
            <p className="db-subtitle">
              {HEADER_DATE.format(now)} · {count(NETWORK.activeShipments)} active shipments across India
            </p>
          </div>
          <div className="db-header__actions">
            <label className="db-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search tracking ID, city, customer…"
                aria-label="Search shipments"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </label>
            <ThemeToggle />
            <Button>+ New shipment</Button>
          </div>
        </header>

        <section className="db-kpis" aria-label="Key metrics">
          {KPIS.map(k => (
            <AnimatedKpi key={k.label} kpi={k} />
          ))}
        </section>

        <section className="db-middle">
          <Card title="Live network" meta={`${NETWORK.trucksOnRoad} trucks · updated 4 s ago`} className="db-map">
            <NetworkMap />
          </Card>

          <Card
            title="Needs attention"
            meta={state === 'ready' && attention.length ? `${shown.length} of ${attention.length} · by SLA risk` : 'sorted by SLA risk'}
            flush
            className="db-attention"
          >
            <AttentionList state={state} error={error} rows={shown} total={attention.length} query={query} onRetry={load} />
          </Card>
        </section>

        <section className="db-charts">
          <Card title="Deliveries · last 14 days" meta="on time vs late">
            <ChartLegend items={DELIVERY_SERIES} className="db-legend--inline" />
            <div className="db-chart">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deliveries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  {/* preserveStartEnd drops ticks that would collide (every other on desktop, every fourth on a phone). */}
                  <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} dy={4} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={34} tickCount={4} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    cursor={{ fill: 'var(--chart-grid)' }}
                  />
                  <Bar
                    dataKey="onTime"
                    name="On time"
                    stackId="d"
                    fill="var(--chart-on-time)"
                    maxBarSize={18}
                    radius={4}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="late"
                    name="Late"
                    stackId="d"
                    fill="var(--chart-late)"
                    maxBarSize={18}
                    radius={4}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Why shipments are late" meta="this month">
            <div className="db-donut">
              <div className="db-donut__chart">
                <ResponsiveContainer width="100%" height={176}>
                  <PieChart>
                    <Pie
                      data={LATE_REASONS}
                      dataKey="share"
                      nameKey="reason"
                      innerRadius="70%"
                      outerRadius="100%"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {LATE_REASONS.map(r => (
                        <Cell key={r.reason} fill={r.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={v => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="db-donut__center" aria-hidden="true">
                  <strong>{LATE_TOTAL}</strong>
                  <span>late</span>
                </div>
              </div>
              <ul className="db-legend db-legend--stack" aria-label="Late reasons">
                {LATE_REASONS.map(r => (
                  <li key={r.reason}>
                    <span className="db-legend__swatch" style={{ background: r.color }} aria-hidden="true" />
                    <span className="db-legend__name">{r.reason}</span>
                    <span className="db-legend__value">{r.share}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Cost per route" meta="₹ per kg">
            <div className="db-chart">
              <ResponsiveContainer width="100%" height={232}>
                <BarChart data={COST_PER_ROUTE} layout="vertical" margin={{ top: 18, right: 0, left: 0, bottom: 0 }} barSize={6}>
                  <defs>
                    <linearGradient id="db-route-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#ff8a3d" />
                      <stop offset="1" stopColor="#ffb547" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="route" hide />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    cursor={false}
                    formatter={v => [inr(Number(v)), 'per kg']}
                  />
                  <Bar
                    dataKey="costPerKg"
                    name="Cost per kg"
                    fill="url(#db-route-gradient)"
                    radius={3}
                    background={RouteTrack}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}

/* ---------- Needs attention ---------- */

interface AttentionListProps {
  state: LoadState
  error: string
  rows: AttentionRow[]
  total: number
  query: string
  onRetry: () => void
}

function AttentionList({ state, error, rows, total, query, onRetry }: AttentionListProps) {
  if (state === 'loading') {
    return (
      <div className="db-skeleton" role="status" aria-live="polite" aria-label="Loading shipments">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="db-skeleton__row" aria-hidden="true">
            <span className="db-skeleton__bar db-skeleton__bar--id" />
            <span className="db-skeleton__stack">
              <span className="db-skeleton__bar db-skeleton__bar--route" />
              <span className="db-skeleton__bar db-skeleton__bar--track" />
            </span>
            <span className="db-skeleton__bar db-skeleton__bar--pill" />
          </div>
        ))}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="db-state db-state--error" role="alert">
        <strong>Could not load shipments</strong>
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="db-state">
        <span className="db-state__icon" aria-hidden="true">
          ✓
        </span>
        <strong>All clear</strong>
        <span>No shipments need attention right now.</span>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="db-state">
        <strong>No matches</strong>
        <span>Nothing matches “{query.trim()}”.</span>
      </div>
    )
  }

  return (
    <>
      {rows.map(r => (
        <Link key={r.id} to={`/shipments/${encodeURIComponent(r.id)}`} className="db-attention__link">
          <DataRow
            label={<span className="db-id">{r.id}</span>}
            value={
              <span className="db-progress-wrap">
                <span className="db-route">{r.route}</span>
                <span
                  className="db-progress"
                  role="progressbar"
                  aria-valuenow={r.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${r.id} journey progress`}
                >
                  <span className="db-progress__fill" style={{ width: `${r.progress}%` }} />
                </span>
              </span>
            }
            trailing={<StatusPill status={r.status}>{r.label}</StatusPill>}
          />
        </Link>
      ))}
    </>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
