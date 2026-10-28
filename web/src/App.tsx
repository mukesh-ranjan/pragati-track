import { useEffect, useMemo, useState } from 'react'
import { listShipments, type ShipmentSummary } from './api'
import { shortTime, statusLabel } from './format'

export default function App() {
  const [rows, setRows] = useState<ShipmentSummary[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    listShipments().then(setRows).catch(e => setError(String(e)))
  }, [])

  const shown = useMemo(
    () => rows.filter(r => r.tracking_id.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, query],
  )

  return (
    <main>
      <header>
        <h1>Pragati Track</h1>
        <p>Where is my parcel? Live status for every Pragati Logistics shipment.</p>
      </header>
      <input placeholder="Search a tracking ID, e.g. PRG-10021" value={query} onChange={e => setQuery(e.target.value)} />
      {error && <p className="error">Could not load shipments: {error}</p>}
      <table>
        <thead>
          <tr><th>Tracking ID</th><th>Route</th><th>Status</th><th>Last seen</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {shown.map(s => (
            <tr key={s.tracking_id}>
              <td className="mono">{s.tracking_id}</td>
              <td>{s.origin} → {s.destination}</td>
              <td><span className={`pill ${s.status}`}>{statusLabel(s.status)}</span></td>
              <td>{s.last_location}</td>
              <td>{shortTime(s.last_update)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
