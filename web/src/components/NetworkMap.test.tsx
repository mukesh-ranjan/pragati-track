import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { HUBS, LANES, TRUCKS } from '../data/seed'
import { hubById, laneCurve, pointAlong, roundTrip, trucksGeoJson, truckPositions } from './networkGeometry'

/* ---------- MapLibre stub ---------- */

type Handler = () => void

const created: FakeMap[] = []
let throwOnCreate = false

class FakeMap {
  options: Record<string, unknown>
  handlers = new Map<string, Handler[]>()
  sources = new Map<string, Record<string, unknown>>()
  layers: Record<string, unknown>[] = []
  setStyle = vi.fn()
  remove = vi.fn()

  constructor(options: Record<string, unknown>) {
    if (throwOnCreate) throw new Error('Failed to initialize WebGL')
    this.options = options
    created.push(this)
  }
  on(event: string, cb: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), cb])
  }
  once(event: string, cb: Handler) {
    this.on(event, cb)
  }
  off() {}
  fire(event: string) {
    for (const cb of this.handlers.get(event) ?? []) cb()
  }
  addSource(id: string, source: Record<string, unknown>) {
    this.sources.set(id, source)
  }
  addLayer(layer: Record<string, unknown>) {
    this.layers.push(layer)
  }
  getSource(id: string) {
    const s = this.sources.get(id)
    return s && { setData: (data: unknown) => (s.data = data) }
  }
}

vi.mock('maplibre-gl', () => ({ Map: FakeMap }))

// Imported after the mock so the component picks up the stub.
const { MAP_STYLES, NetworkMap } = await import('./NetworkMap')

function stubMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: reduced, addEventListener() {}, removeEventListener() {} }),
  )
}

beforeEach(() => {
  created.length = 0
  throwOnCreate = false
  document.documentElement.dataset.theme = 'dark'
  stubMotion(false)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/* ---------- Geometry ---------- */

describe('network geometry', () => {
  it('seeds eight hubs and lanes that only join known hubs', () => {
    expect(HUBS).toHaveLength(8)
    for (const lane of LANES) {
      expect(hubById(lane.from).id).toBe(lane.from)
      expect(hubById(lane.to).id).toBe(lane.to)
    }
    expect(() => hubById('XXX')).toThrow()
  })

  it('curves a lane from the origin hub to the destination hub, bulging in between', () => {
    const lane = LANES.find(l => l.id === 'MUM-DEL')!
    const curve = laneCurve(lane)
    const [first, last] = [curve.points[0], curve.points[curve.points.length - 1]]
    expect(first[0]).toBeCloseTo(hubById('MUM').lng, 6)
    expect(first[1]).toBeCloseTo(hubById('MUM').lat, 6)
    expect(last[0]).toBeCloseTo(hubById('DEL').lng, 6)
    expect(last[1]).toBeCloseTo(hubById('DEL').lat, 6)
    // The midpoint of the arc is off the straight line between the hubs.
    const mid = curve.points[curve.points.length >> 1]
    const straightMidLng = (first[0] + last[0]) / 2
    expect(Math.abs(mid[0] - straightMidLng)).toBeGreaterThan(0.3)
    expect(pointAlong(curve, 0)).toEqual(first)
    expect(pointAlong(curve, 1)).toEqual(last)
  })

  it('shuttles trucks out and back rather than teleporting to the start', () => {
    expect(roundTrip(0)).toBe(0)
    expect(roundTrip(0.25)).toBeCloseTo(0.5)
    expect(roundTrip(0.5)).toBeCloseTo(1)
    expect(roundTrip(0.75)).toBeCloseTo(0.5)
    expect(roundTrip(1.25)).toBeCloseTo(0.5)
  })

  it('positions about twenty trucks and moves them over time', () => {
    const t0 = truckPositions(0)
    const t1 = truckPositions(1)
    expect(TRUCKS.length).toBeGreaterThanOrEqual(20)
    expect(t0).toHaveLength(TRUCKS.length)
    const moved = t0.filter((p, i) => p.position[0] !== t1[i].position[0] || p.position[1] !== t1[i].position[1])
    expect(moved.length).toBe(TRUCKS.length)
    const risks = new Set(trucksGeoJson(0).features.map(f => f.properties?.risk))
    expect(risks).toEqual(new Set(['on_time', 'at_risk', 'delayed']))
  })
})

/* ---------- Component ---------- */

describe('NetworkMap', () => {
  it('creates the map on the dark OpenFreeMap style and overlays hubs, lanes and trucks', () => {
    render(<NetworkMap />)
    expect(created).toHaveLength(1)
    const map = created[0]
    expect(map.options.style).toBe(MAP_STYLES.dark)
    expect(map.options.attributionControl).toEqual({ compact: false })

    act(() => map.fire('style.load'))
    expect([...map.sources.keys()]).toEqual(['lanes', 'hubs', 'trucks'])
    expect(map.layers.map(l => l.id)).toEqual(['lanes-glow', 'lanes', 'hubs', 'hub-labels', 'trucks'])
    const lanes = map.layers.find(l => l.id === 'lanes') as { paint: { 'line-color': unknown[] } }
    expect(lanes.paint['line-color'][0]).toBe('match')
  })

  it('shows a legend with the three SLA risk levels', () => {
    render(<NetworkMap />)
    const legend = screen.getByRole('list', { name: 'SLA risk' })
    expect(legend.textContent).toContain('On time')
    expect(legend.textContent).toContain('At risk')
    expect(legend.textContent).toContain('Delayed')
  })

  it('swaps to the light style when the theme flips, without diffing', async () => {
    render(<NetworkMap />)
    const map = created[0]
    document.documentElement.dataset.theme = 'light'
    await waitFor(() => expect(map.setStyle).toHaveBeenCalledWith(MAP_STYLES.light, { diff: false }))
  })

  it('reports paused motion when the user prefers reduced motion', () => {
    stubMotion(true)
    render(<NetworkMap />)
    expect(screen.getByRole('region').dataset.motion).toBe('paused')
  })

  it('falls back to a message when WebGL is unavailable', () => {
    throwOnCreate = true
    render(<NetworkMap />)
    expect(screen.getByText(/needs WebGL/)).toBeTruthy()
    expect(screen.getByRole('region').dataset.state).toBe('unsupported')
  })

  it('removes the map on unmount', () => {
    const { unmount } = render(<NetworkMap />)
    const map = created[0]
    unmount()
    expect(map.remove).toHaveBeenCalled()
  })
})
