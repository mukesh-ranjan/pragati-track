import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Shipment, TrackingEvent } from '../api'
import ShipmentDetail, { newestFirst } from './ShipmentDetail'

/* Events deliberately out of list order (T-4512): the 23:10 linehaul departure sits last. */
const EVENTS: TrackingEvent[] = [
  { at: '2026-11-05T08:30', location: 'Bhiwandi Hub', status: 'picked_up', note: '' },
  { at: '2026-11-06T19:40', location: 'Jaipur Transit', status: 'in_transit', note: '' },
  { at: '2026-11-05T23:10', location: 'Bhiwandi Hub', status: 'in_transit', note: 'Linehaul departed' },
]

const SHIPMENT: Shipment = {
  tracking_id: 'PRG-10022',
  origin: 'Mumbai',
  destination: 'Delhi',
  weight_kg: 12,
  service: 'standard',
  status: 'in_transit',
  eta: '2026-11-13T14:00',
  events: EVENTS,
}

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }),
  )
}

function mount(id = 'PRG-10022') {
  return render(
    <MemoryRouter initialEntries={[`/shipments/${id}`]}>
      <Routes>
        <Route path="/shipments/:id" element={<ShipmentDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('newestFirst', () => {
  it('orders by timestamp, latest first, regardless of list position', () => {
    expect(newestFirst(EVENTS).map(e => e.at)).toEqual(['2026-11-06T19:40', '2026-11-05T23:10', '2026-11-05T08:30'])
  })

  it('does not mutate the input', () => {
    const copy = [...EVENTS]
    newestFirst(EVENTS)
    expect(EVENTS).toEqual(copy)
  })
})

describe('ShipmentDetail timeline', () => {
  it('renders the journey newest first and marks the latest event as current', async () => {
    respondWith(SHIPMENT)
    mount()
    const list = await waitFor(() => screen.getByRole('list', { name: 'Journey, newest first' }))
    const items = within(list).getAllByRole('listitem')
    const times = items.map(li => li.querySelector('time')?.getAttribute('datetime'))
    expect(times).toEqual(['2026-11-06T19:40', '2026-11-05T23:10', '2026-11-05T08:30'])
    expect(items[0].getAttribute('aria-current')).toBe('step')
    expect(items[0].classList.contains('sd-event--current')).toBe(true)
    expect(items[1].getAttribute('aria-current')).toBeNull()
  })

  it('requests the shipment named in the URL and shows its header', async () => {
    respondWith(SHIPMENT)
    mount()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('PRG-10022'))
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('http://localhost:8000/shipments/PRG-10022')
    expect(screen.getByText('Mumbai (Bhiwandi Hub) → Delhi · 12.0 kg · Standard')).toBeTruthy()
  })

  it('shows a not-found state on a 404', async () => {
    respondWith({ detail: 'Shipment PRG-999 not found' }, 404)
    mount('PRG-999')
    await waitFor(() => expect(screen.getByText('Shipment PRG-999 not found')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Back to overview' }).getAttribute('href')).toBe('/')
  })
})
