export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type Status = 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'

export interface ShipmentSummary {
  tracking_id: string
  origin: string
  destination: string
  status: Status
  last_location: string
  last_update: string
  /** ISO timestamp, or null when delivered or in exception (T-4527). */
  eta: string | null
}

export interface TrackingEvent {
  /** ISO timestamp. Events may arrive out of order (T-4512): sort by this, not by position. */
  at: string
  location: string
  status: Status
  note: string
}

/** Full shipment from GET /shipments/{id}; mirrors `Shipment` in api/app/models.py. */
export interface Shipment {
  tracking_id: string
  origin: string
  destination: string
  weight_kg: number
  service: 'standard' | 'express'
  status: Status
  events: TrackingEvent[]
  eta: string | null
}

/** Non-2xx response; `status` lets callers tell a 404 from an outage. */
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API error ${status}`)
    this.name = 'ApiError'
  }
}

export async function listShipments(): Promise<ShipmentSummary[]> {
  const r = await fetch(`${API_URL}/shipments`)
  if (!r.ok) throw new ApiError(r.status)
  return r.json()
}

export async function getShipment(trackingId: string): Promise<Shipment> {
  const r = await fetch(`${API_URL}/shipments/${encodeURIComponent(trackingId)}`)
  if (!r.ok) throw new ApiError(r.status)
  return r.json()
}
