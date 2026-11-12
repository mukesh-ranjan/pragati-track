/**
 * Fictional demo numbers for the control-tower dashboard.
 * Nothing here comes from the API; the "Needs attention" list does (see Dashboard.tsx),
 * but its progress and SLA annotations are looked up here by tracking ID.
 */
import type { KpiAccent, PillStatus } from '../components'

export const OPERATOR = { name: 'Ravi' }

export const NETWORK = {
  hubs: 14,
  trucksOnRoad: 212,
  activeShipments: 1284,
}

export interface KpiSeed {
  label: string
  /** Raw number; the page formats it (and counts up to it). */
  value: number
  format: 'percent' | 'count' | 'inr'
  delta: { label: string; trend: 'up' | 'down' | 'flat'; tone?: 'positive' | 'negative' | 'neutral' }
  /** Last 7 days, oldest first. */
  sparkline: number[]
  accent: KpiAccent
}

export const KPIS: KpiSeed[] = [
  {
    label: 'On-time delivery',
    value: 94.6,
    format: 'percent',
    delta: { label: '2.1 pts vs last week', trend: 'up' },
    sparkline: [91.2, 92.0, 91.6, 93.1, 93.8, 93.4, 94.6],
    accent: 'success',
  },
  {
    label: 'In transit',
    value: 1284,
    format: 'count',
    delta: { label: '86 since 06:00', trend: 'up', tone: 'positive' },
    sparkline: [1140, 1162, 1151, 1198, 1210, 1243, 1284],
    accent: 'info',
  },
  {
    label: 'Delayed',
    value: 37,
    format: 'count',
    delta: { label: '9 need action', trend: 'up', tone: 'negative' },
    sparkline: [22, 25, 31, 28, 34, 39, 37],
    accent: 'danger',
  },
  {
    label: 'Cost per kg',
    value: 18.4,
    format: 'inr',
    delta: { label: '₹0.62 vs October', trend: 'down', tone: 'positive' },
    sparkline: [19.4, 19.1, 19.3, 18.9, 18.7, 18.5, 18.4],
    accent: 'saffron',
  },
]

export interface DeliveryDay {
  /** ISO date, e.g. "2026-11-01". */
  date: string
  onTime: number
  late: number
}

/** Deliveries per day for the 14 days ending 11 Nov 2026. */
export const DELIVERIES_14D: DeliveryDay[] = [
  { date: '2026-10-29', onTime: 402, late: 31 },
  { date: '2026-10-30', onTime: 418, late: 27 },
  { date: '2026-10-31', onTime: 395, late: 34 },
  { date: '2026-11-01', onTime: 441, late: 22 },
  { date: '2026-11-02', onTime: 456, late: 25 },
  { date: '2026-11-03', onTime: 470, late: 38 },
  { date: '2026-11-04', onTime: 433, late: 44 },
  { date: '2026-11-05', onTime: 388, late: 29 },
  { date: '2026-11-06', onTime: 412, late: 21 },
  { date: '2026-11-07', onTime: 479, late: 26 },
  { date: '2026-11-08', onTime: 462, late: 19 },
  { date: '2026-11-09', onTime: 488, late: 24 },
  { date: '2026-11-10', onTime: 503, late: 30 },
  { date: '2026-11-11', onTime: 497, late: 37 },
]

export interface LateReason {
  reason: string
  share: number
  /** CSS colour, from the --chart-* tokens so it follows the theme. */
  color: string
}

/** Why this month's late shipments were late. Shares sum to 100. */
export const LATE_REASONS: LateReason[] = [
  { reason: 'Weather', share: 34, color: 'var(--chart-1)' },
  { reason: 'Hub congestion', share: 27, color: 'var(--chart-2)' },
  { reason: 'Address issues', share: 19, color: 'var(--chart-4)' },
  { reason: 'Vehicle', share: 12, color: 'var(--chart-3)' },
  { reason: 'Other', share: 8, color: 'var(--chart-other)' },
]

export const LATE_TOTAL = 37

export interface RouteCost {
  route: string
  /** Rupees per chargeable kg. */
  costPerKg: number
}

export const COST_PER_ROUTE: RouteCost[] = [
  { route: 'Mumbai → Delhi', costPerKg: 21.4 },
  { route: 'Pune → Bengaluru', costPerKg: 17.9 },
  { route: 'Chennai → Hyd', costPerKg: 16.2 },
  { route: 'Kolkata → Guwahati', costPerKg: 24.8 },
  { route: 'Ahmedabad → Pune', costPerKg: 15.1 },
]

export interface ExceptionNote {
  /** Short name, e.g. "Weather delay". */
  title: string
  /** What happened, one or two sentences. */
  detail: string
  /** The suggested next action for the agent. */
  nextStep: string
}

export interface AttentionNote {
  /** Journey progress, 0–100. */
  progress: number
  /** Override the pill derived from the API status, e.g. a delay on an in-transit parcel. */
  status?: PillStatus
  /** Override the pill text, e.g. "Delayed 3 h". */
  label?: string
  /** Open exception shown on the detail page; the API only carries the raw event note. */
  exception?: ExceptionNote
}

/** Operational annotations for the API's sample shipments, keyed by tracking ID. */
export const ATTENTION_NOTES: Record<string, AttentionNote> = {
  'PRG-10022': {
    progress: 62,
    status: 'delayed',
    label: 'Delayed 3 h',
    exception: {
      title: 'Weather delay',
      detail: 'Linehaul missed its slot: fog on NH-48 near Shahjahanpur. SLA breach risk 72%.',
      nextStep: 'Notify the customer and offer a free reschedule window.',
    },
  },
  'PRG-10023': {
    progress: 84,
    status: 'exception',
    label: 'Address issue',
    exception: {
      title: 'Address issue',
      detail: 'Delivery address is incomplete; the customer has been contacted once.',
      nextStep: 'Confirm the full address with the customer, then re-dispatch from Hyderabad Hub.',
    },
  },
  'PRG-10024': { progress: 86 },
  'PRG-10021': { progress: 100 },
  'PRG-10025': { progress: 4, status: 'at_risk' },
}

/** Every shipment carries a booking and an e-way bill; these are the extras, keyed by tracking ID. */
const EXTRA_DOCUMENTS: Record<string, string[]> = {
  'PRG-10021': ['Proof of delivery'],
  'PRG-10022': ['Hub photo · Jaipur'],
  'PRG-10023': ['Customer call log'],
}

/** Document names shown on the detail page (fictional; there is no file store yet). */
export function documentsFor(trackingId: string): string[] {
  return ['Booking.pdf', 'E-way bill', ...(EXTRA_DOCUMENTS[trackingId] ?? [])]
}

/* ---------- Live network map ---------- */

/** SLA risk of a lane; the map colours lanes and trucks by it (teal / amber / red). */
export type SlaRisk = 'on_time' | 'at_risk' | 'delayed'

export interface Hub {
  /** Three-letter code, also used as the lane endpoint reference. */
  id: string
  name: string
  /** WGS84 longitude, degrees east. */
  lng: number
  /** WGS84 latitude, degrees north. */
  lat: number
}

/** The eight major hubs drawn on the live map (the network has 14; the rest are spokes). */
export const HUBS: Hub[] = [
  { id: 'DEL', name: 'Delhi', lng: 77.209, lat: 28.6139 },
  { id: 'AMD', name: 'Ahmedabad', lng: 72.5714, lat: 23.0225 },
  { id: 'MUM', name: 'Mumbai', lng: 72.8777, lat: 19.076 },
  { id: 'PUN', name: 'Pune', lng: 73.8567, lat: 18.5204 },
  { id: 'HYD', name: 'Hyderabad', lng: 78.4867, lat: 17.385 },
  { id: 'BLR', name: 'Bengaluru', lng: 77.5946, lat: 12.9716 },
  { id: 'CHE', name: 'Chennai', lng: 80.2707, lat: 13.0827 },
  { id: 'KOL', name: 'Kolkata', lng: 88.3639, lat: 22.5726 },
]

export interface Lane {
  id: string
  /** Hub IDs. Lanes are drawn as an arc bulging to the left of the from→to direction. */
  from: string
  to: string
  risk: SlaRisk
}

/** Trunk lanes between hubs. Mumbai→Delhi and Kolkata→Hyderabad are the morning's delays. */
export const LANES: Lane[] = [
  { id: 'MUM-DEL', from: 'MUM', to: 'DEL', risk: 'delayed' },
  { id: 'AMD-DEL', from: 'AMD', to: 'DEL', risk: 'on_time' },
  { id: 'AMD-MUM', from: 'AMD', to: 'MUM', risk: 'on_time' },
  { id: 'MUM-PUN', from: 'MUM', to: 'PUN', risk: 'on_time' },
  { id: 'PUN-BLR', from: 'PUN', to: 'BLR', risk: 'on_time' },
  { id: 'PUN-HYD', from: 'PUN', to: 'HYD', risk: 'on_time' },
  { id: 'HYD-CHE', from: 'HYD', to: 'CHE', risk: 'at_risk' },
  { id: 'HYD-BLR', from: 'HYD', to: 'BLR', risk: 'on_time' },
  { id: 'BLR-CHE', from: 'BLR', to: 'CHE', risk: 'on_time' },
  { id: 'DEL-KOL', from: 'DEL', to: 'KOL', risk: 'at_risk' },
  { id: 'KOL-HYD', from: 'KOL', to: 'HYD', risk: 'delayed' },
  { id: 'KOL-CHE', from: 'KOL', to: 'CHE', risk: 'on_time' },
]

export interface TruckSeed {
  id: string
  /** Lane ID the truck shuttles along. */
  lane: string
  /** Where in the round trip it is at time zero, 0–1 (0.5 is at the far end, turning back). */
  phase: number
  /** Seconds for one full round trip. */
  period: number
}

/** About twenty trucks on the trunk lanes; the other ~190 are on spokes the map does not draw. */
export const TRUCKS: TruckSeed[] = [
  { id: 'MH12-4471', lane: 'MUM-DEL', phase: 0.12, period: 96 },
  { id: 'DL1L-2208', lane: 'MUM-DEL', phase: 0.58, period: 104 },
  { id: 'MH04-9910', lane: 'MUM-DEL', phase: 0.33, period: 90 },
  { id: 'GJ01-3187', lane: 'AMD-DEL', phase: 0.05, period: 88 },
  { id: 'GJ05-7724', lane: 'AMD-DEL', phase: 0.71, period: 94 },
  { id: 'GJ27-1159', lane: 'AMD-MUM', phase: 0.4, period: 72 },
  { id: 'MH43-6632', lane: 'MUM-PUN', phase: 0.2, period: 48 },
  { id: 'MH14-0875', lane: 'MUM-PUN', phase: 0.77, period: 52 },
  { id: 'MH12-2290', lane: 'PUN-BLR', phase: 0.1, period: 110 },
  { id: 'KA05-5531', lane: 'PUN-BLR', phase: 0.63, period: 102 },
  { id: 'TS09-4418', lane: 'PUN-HYD', phase: 0.46, period: 84 },
  { id: 'TS07-8806', lane: 'HYD-CHE', phase: 0.28, period: 80 },
  { id: 'TN01-3374', lane: 'HYD-CHE', phase: 0.86, period: 76 },
  { id: 'KA01-6192', lane: 'HYD-BLR', phase: 0.15, period: 78 },
  { id: 'KA53-9047', lane: 'BLR-CHE', phase: 0.52, period: 60 },
  { id: 'TN22-1066', lane: 'BLR-CHE', phase: 0.93, period: 64 },
  { id: 'DL1G-7751', lane: 'DEL-KOL', phase: 0.3, period: 120 },
  { id: 'WB23-2819', lane: 'DEL-KOL', phase: 0.68, period: 126 },
  { id: 'WB11-5540', lane: 'KOL-HYD', phase: 0.22, period: 112 },
  { id: 'TS12-0193', lane: 'KOL-HYD', phase: 0.81, period: 108 },
  { id: 'WB02-4476', lane: 'KOL-CHE', phase: 0.37, period: 118 },
]
