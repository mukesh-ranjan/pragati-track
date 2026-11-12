import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

// jsdom has no WebGL, so the live map's MapLibre instance is a stub (see NetworkMap.test.tsx for the real one).
vi.mock('maplibre-gl', () => ({
  Map: class {
    on() {}
    once() {}
    off() {}
    remove() {}
    getSource() {
      return undefined
    }
    setStyle() {}
  },
}))

// jsdom has neither; Recharts' ResponsiveContainer needs the first, useCountUp checks the second.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function mount() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

function respondWith(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }),
  )
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Dashboard needs-attention states', () => {
  it('shows a loading skeleton until the API answers', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    mount()
    expect(screen.getByRole('status', { name: 'Loading shipments' })).toBeTruthy()
  })

  it('lists shipments as rows with a status pill, worst first', async () => {
    respondWith([
      { tracking_id: 'PRG-1', origin: 'Pune', destination: 'Bengaluru', status: 'delivered', last_location: '', last_update: '', eta: null },
      { tracking_id: 'PRG-2', origin: 'Chennai', destination: 'Hyderabad', status: 'exception', last_location: '', last_update: '', eta: null },
    ])
    mount()
    await waitFor(() => expect(screen.getByText('PRG-2')).toBeTruthy())
    const ids = screen.getAllByText(/^PRG-\d$/).map(el => el.textContent)
    expect(ids).toEqual(['PRG-2', 'PRG-1'])
    expect(screen.getByText('Exception')).toBeTruthy()
    expect(screen.getByText('Delivered')).toBeTruthy()
  })

  it('links each row to the shipment detail page', async () => {
    respondWith([
      { tracking_id: 'PRG-10022', origin: 'Mumbai', destination: 'Delhi', status: 'in_transit', last_location: '', last_update: '', eta: null },
    ])
    mount()
    const link = await waitFor(() => screen.getByRole('link', { name: /PRG-10022/ }))
    expect(link.getAttribute('href')).toBe('/shipments/PRG-10022')
  })

  it('shows an all-clear empty state when nothing comes back', async () => {
    respondWith([])
    mount()
    await waitFor(() => expect(screen.getByText('All clear')).toBeTruthy())
  })

  it('shows the error with a retry button when the API fails', async () => {
    respondWith(null, false)
    mount()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByText('API error 500')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})

describe('Dashboard KPIs', () => {
  it('formats the seeded values with the rupee sign and Indian grouping', async () => {
    respondWith([])
    mount()
    expect(screen.getByText('₹18.40')).toBeTruthy()
    expect(screen.getByText('1,284')).toBeTruthy()
    expect(screen.getByText('94.6%')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('All clear')).toBeTruthy())
  })
})
