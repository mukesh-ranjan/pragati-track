/**
 * Pure geometry for the live network map: curved lanes between hubs and truck
 * positions along them. No MapLibre here, so it runs (and is tested) in jsdom.
 * Coordinates are [lng, lat] pairs, as GeoJSON wants them.
 */
import type { FeatureCollection, LineString, Point } from 'geojson'
import { HUBS, LANES, TRUCKS, type Hub, type Lane, type SlaRisk, type TruckSeed } from '../data/seed'

export type LngLat = [number, number]

/** A lane sampled into points plus the cumulative distance to each one. */
export interface LaneCurve {
  lane: Lane
  points: LngLat[]
  /** Cumulative length up to each point, in the same (degree-ish) units as `points`. */
  lengths: number[]
}

const HUB_BY_ID = new Map<string, Hub>(HUBS.map(h => [h.id, h]))

/** How far the arc bulges, as a fraction of the straight-line distance. */
const CURVATURE = 0.18
const SEGMENTS = 48

export function hubById(id: string): Hub {
  const hub = HUB_BY_ID.get(id)
  if (!hub) throw new Error(`Unknown hub "${id}"`)
  return hub
}

/**
 * Quadratic Bézier from one hub to another, bulging to the left of travel.
 * Longitude is scaled by cos(lat) when working out the perpendicular so the
 * arc looks round on the map rather than squashed.
 */
export function laneCurve(lane: Lane, segments = SEGMENTS): LaneCurve {
  const a = hubById(lane.from)
  const b = hubById(lane.to)
  const midLat = (a.lat + b.lat) / 2
  const k = Math.cos((midLat * Math.PI) / 180)

  // Work in a locally flat space: x = lng * k, y = lat.
  const ax = a.lng * k
  const bx = b.lng * k
  const dx = bx - ax
  const dy = b.lat - a.lat
  const dist = Math.hypot(dx, dy)
  const cx = (ax + bx) / 2 - (dy / dist) * dist * CURVATURE
  const cy = (a.lat + b.lat) / 2 + (dx / dist) * dist * CURVATURE

  const points: LngLat[] = []
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const x = u * u * ax + 2 * u * t * cx + t * t * bx
    const y = u * u * a.lat + 2 * u * t * cy + t * t * b.lat
    const p: LngLat = [x / k, y]
    if (i > 0) {
      const [px, py] = points[i - 1]
      total += Math.hypot((x - px * k), y - py)
    }
    points.push(p)
    lengths.push(total)
  }
  return { lane, points, lengths }
}

/** The point a fraction `t` (0–1) of the way along the curve, by arc length. */
export function pointAlong(curve: LaneCurve, t: number): LngLat {
  const { points, lengths } = curve
  const total = lengths[lengths.length - 1]
  const target = Math.min(Math.max(t, 0), 1) * total
  let i = 1
  while (i < lengths.length - 1 && lengths[i] < target) i++
  const l0 = lengths[i - 1]
  const l1 = lengths[i]
  const f = l1 === l0 ? 0 : (target - l0) / (l1 - l0)
  const [x0, y0] = points[i - 1]
  const [x1, y1] = points[i]
  return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]
}

/** Round-trip progress → one-way position: out on the first half, back on the second. */
export function roundTrip(phase: number): number {
  const p = phase - Math.floor(phase)
  return p < 0.5 ? p * 2 : (1 - p) * 2
}

export const LANE_CURVES: LaneCurve[] = LANES.map(l => laneCurve(l))
const CURVE_BY_LANE = new Map<string, LaneCurve>(LANE_CURVES.map(c => [c.lane.id, c]))

export interface TruckPosition {
  truck: TruckSeed
  risk: SlaRisk
  position: LngLat
}

/** Where every seeded truck is `seconds` after the page loaded. */
export function truckPositions(seconds: number): TruckPosition[] {
  return TRUCKS.map(truck => {
    const curve = CURVE_BY_LANE.get(truck.lane)
    if (!curve) throw new Error(`Truck ${truck.id} is on unknown lane "${truck.lane}"`)
    const t = roundTrip(truck.phase + seconds / truck.period)
    return { truck, risk: curve.lane.risk, position: pointAlong(curve, t) }
  })
}

/** Bounding box of the hubs as [[west, south], [east, north]]. */
export function hubBounds(): [LngLat, LngLat] {
  const lngs = HUBS.map(h => h.lng)
  const lats = HUBS.map(h => h.lat)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

/* ---------- GeoJSON ---------- */

export function hubsGeoJson(): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: HUBS.map(h => ({
      type: 'Feature',
      properties: { id: h.id, name: h.name },
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
    })),
  }
}

export function lanesGeoJson(): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: LANE_CURVES.map(c => ({
      type: 'Feature',
      properties: { id: c.lane.id, risk: c.lane.risk },
      geometry: { type: 'LineString', coordinates: c.points },
    })),
  }
}

export function trucksGeoJson(seconds: number): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: truckPositions(seconds).map(p => ({
      type: 'Feature',
      properties: { id: p.truck.id, risk: p.risk },
      geometry: { type: 'Point', coordinates: p.position },
    })),
  }
}
