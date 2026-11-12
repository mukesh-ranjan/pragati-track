import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getShipment, type Shipment, type Status, type TrackingEvent } from '../api'
import { API_STATUS_PILL, Button, Card, Sidebar, StatusPill } from '../components'
import { cx } from '../components/cx'
import { ATTENTION_NOTES, NETWORK, documentsFor, type ExceptionNote } from '../data/seed'
import { etaLabel, shortTime } from '../format'
import { NAV } from '../nav'
import './shipment-detail.css'

/** Timeline order: latest timestamp first. Events can arrive out of order (T-4512), so never trust list position. */
export function newestFirst(events: TrackingEvent[]): TrackingEvent[] {
  return [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/** Oldest event, used for the pickup hub in the header. */
function oldest(events: TrackingEvent[]): TrackingEvent | undefined {
  const sorted = newestFirst(events)
  return sorted[sorted.length - 1]
}

const EVENT_LABELS: Record<Status, string> = {
  booked: 'Booked',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  exception: 'Exception',
}

const ETA_TIME = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** The exception to show: the seeded note if there is one, else derived from the latest exception event. */
function exceptionFor(shipment: Shipment): ExceptionNote | null {
  const seeded = ATTENTION_NOTES[shipment.tracking_id]?.exception
  if (seeded) return seeded
  const event = newestFirst(shipment.events).find(e => e.status === 'exception')
  if (!event) return null
  return {
    title: 'Exception',
    detail: event.note || `Held at ${event.location}.`,
    nextStep: `Contact the customer, then re-dispatch from ${event.location}.`,
  }
}

type LoadState = 'loading' | 'error' | 'missing' | 'ready'

export default function ShipmentDetail() {
  const { id = '' } = useParams()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setState('loading')
    setError('')
    getShipment(id)
      .then(s => {
        setShipment(s)
        setState('ready')
      })
      .catch(e => {
        if (e instanceof ApiError && e.status === 404) {
          setState('missing')
          return
        }
        setError(e instanceof Error ? e.message : String(e))
        setState('error')
      })
  }, [id])

  useEffect(load, [load])

  return (
    <div className="sd">
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

      <main className="sd-main">
        <Link to="/" className="sd-back">
          ← Overview
        </Link>
        {state === 'ready' && shipment ? (
          <Loaded shipment={shipment} />
        ) : (
          <PageState id={id} state={state} error={error} onRetry={load} />
        )}
      </main>
    </div>
  )
}

/* ---------- Loaded page ---------- */

function Loaded({ shipment }: { shipment: Shipment }) {
  const note = ATTENTION_NOTES[shipment.tracking_id]
  const events = newestFirst(shipment.events)
  const first = oldest(shipment.events)
  const pickupHub = first && first.location !== shipment.origin ? ` (${first.location})` : ''
  const exception = exceptionFor(shipment)

  return (
    <>
      <header className="sd-header">
        <div>
          <h1 className="sd-title">
            {shipment.tracking_id}
            <StatusPill status={note?.status ?? API_STATUS_PILL[shipment.status]}>{note?.label}</StatusPill>
          </h1>
          <p className="sd-subtitle">
            {shipment.origin}
            {pickupHub} → {shipment.destination} · {shipment.weight_kg.toFixed(1)} kg · {capitalize(shipment.service)}
          </p>
        </div>
        <Button>Notify customer</Button>
      </header>

      <div className="sd-grid">
        <div className="sd-col">
          <EtaCard shipment={shipment} newest={events[0]} />

          <Card title="Journey" meta={`${events.length} events · newest first`}>
            <Timeline events={events} />
          </Card>

          <Card title="Exceptions" meta={exception ? '1 open' : 'none open'}>
            {exception ? (
              <div className="sd-exception" role="note">
                <p className="sd-exception__text">
                  <span className="sd-exception__title">Exception · {exception.title}</span> {exception.detail}
                </p>
                <p className="sd-exception__next">
                  <strong>Next step:</strong> {exception.nextStep}
                </p>
              </div>
            ) : (
              <p className="sd-allclear">
                <span className="sd-allclear__icon" aria-hidden="true">
                  ✓
                </span>
                No exceptions on this shipment.
              </p>
            )}
          </Card>

          <Card title="Documents" meta={`${documentsFor(shipment.tracking_id).length} files`}>
            <ul className="sd-docs" aria-label="Documents">
              {documentsFor(shipment.tracking_id).map(d => (
                <li key={d}>
                  <span className="sd-docs__icon" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="✦ Ask Pragati AI" meta="coming soon" className="sd-ai">
          <div className="sd-ai__placeholder">
            <strong>Not wired up yet</strong>
            <span>Soon you will be able to ask why this shipment is late and draft a customer update from here.</span>
          </div>
          <div className="sd-ai__input" aria-hidden="true">
            Ask about this shipment, its route or delay…
            <span className="sd-ai__send" />
          </div>
        </Card>
      </div>
    </>
  )
}

/* ---------- ETA ---------- */

function EtaCard({ shipment, newest }: { shipment: Shipment; newest?: TrackingEvent }) {
  if (shipment.status === 'delivered') {
    return (
      <Card title="Delivered" meta="journey complete">
        <div className="sd-eta">
          <span className="sd-eta__value">{newest ? ETA_TIME.format(new Date(newest.at)) : '—'}</span>
          {newest && <span className="sd-eta__hint">at {newest.location}</span>}
        </div>
      </Card>
    )
  }
  if (!shipment.eta) {
    return (
      <Card title="ETA" meta="on hold">
        <div className="sd-eta">
          <span className="sd-eta__value">Awaiting resolution</span>
          <span className="sd-eta__hint">{etaLabel(null)}</span>
        </div>
      </Card>
    )
  }
  return (
    <Card title="ETA" meta={shipment.status === 'out_for_delivery' ? 'out for delivery' : 'estimated'}>
      <div className="sd-eta">
        <time className="sd-eta__value" dateTime={shipment.eta}>
          {ETA_TIME.format(new Date(shipment.eta))}
        </time>
        <span className="sd-eta__hint">{etaLabel(shipment.eta)}</span>
      </div>
    </Card>
  )
}

/* ---------- Timeline ---------- */

function Timeline({ events }: { events: TrackingEvent[] }) {
  if (events.length === 0) return <p className="sd-allclear">No tracking events yet.</p>
  return (
    <ol className="sd-timeline" aria-label="Journey, newest first">
      {events.map((e, i) => (
        <li
          key={`${e.at}-${e.location}-${i}`}
          className={cx('sd-event', i === 0 && 'sd-event--current')}
          data-status={e.status}
          aria-current={i === 0 ? 'step' : undefined}
        >
          <span className="sd-event__dot" aria-hidden="true" />
          <div className="sd-event__main">
            <strong className="sd-event__title">{EVENT_LABELS[e.status]}</strong>
            <span className="sd-event__sub">
              {e.location}
              {e.note && ` · ${e.note}`}
            </span>
          </div>
          <time className="sd-event__time" dateTime={e.at}>
            {shortTime(e.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Loading, error, not found ---------- */

function PageState({ id, state, error, onRetry }: { id: string; state: LoadState; error: string; onRetry: () => void }) {
  if (state === 'loading') {
    return (
      <div className="sd-state" role="status" aria-live="polite" aria-label="Loading shipment">
        <span className="sd-skeleton sd-skeleton--title" aria-hidden="true" />
        <span className="sd-skeleton sd-skeleton--line" aria-hidden="true" />
        <span className="sd-skeleton sd-skeleton--card" aria-hidden="true" />
      </div>
    )
  }
  if (state === 'missing') {
    return (
      <div className="sd-state sd-state--center">
        <strong>Shipment {id} not found</strong>
        <span>Check the tracking ID, or go back to the overview.</span>
        <Link to="/" className="pt-btn pt-btn--ghost pt-btn--sm">
          Back to overview
        </Link>
      </div>
    )
  }
  return (
    <div className="sd-state sd-state--center sd-state--error" role="alert">
      <strong>Could not load shipment {id}</strong>
      <span>{error}</span>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
