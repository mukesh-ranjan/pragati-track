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

export async function listShipments(): Promise<ShipmentSummary[]> {
  const r = await fetch(`${API_URL}/shipments`)
  if (!r.ok) throw new Error(`API error ${r.status}`)
  return r.json()
}
