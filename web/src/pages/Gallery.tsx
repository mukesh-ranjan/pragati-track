import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  DataRow,
  KpiTile,
  PILL_STATUSES,
  StatusPill,
  ThemeToggle,
  type PillStatus,
} from '../components'
import './gallery.css'

const PILLS = Object.keys(PILL_STATUSES) as PillStatus[]

const ON_TIME = [91.2, 92.0, 91.6, 93.1, 93.8, 93.4, 94.6]
const DELAYED = [22, 25, 31, 28, 34, 39, 37]
const COST = [19.4, 19.1, 19.3, 18.9, 18.7, 18.5, 18.4]

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="gl-section" aria-labelledby={`gl-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h2 id={`gl-${title.replace(/\s+/g, '-').toLowerCase()}`}>{title}</h2>
      {hint && <p className="gl-hint">{hint}</p>}
      {children}
    </section>
  )
}

export default function Gallery() {
  return (
    <div className="gl">
      <header className="gl-header">
        <div>
          <p className="gl-eyebrow">Pragati Track · components</p>
          <h1 className="gl-title">Gallery</h1>
          <p className="gl-hint">
            Every component in <code>src/components</code>, built from the tokens only. Tab through the page to see focus rings.
          </p>
        </div>
        <div className="gl-header__actions">
          <Link className="gl-link" to="/style-tile">Style tile</Link>
          <Link className="gl-link" to="/">Dashboard</Link>
          <Link className="gl-link" to="/track">Tracking page</Link>
          <ThemeToggle />
        </div>
      </header>

      <Section title="ThemeToggle" hint="A real button whose accessible name says what it does. Also shown at the top of this page.">
        <div className="gl-row">
          <ThemeToggle />
        </div>
      </Section>

      <Section title="Button" hint="Primary is the one saffron action per view; ghost for everything else.">
        <div className="gl-row">
          <Button>+ New shipment</Button>
          <Button variant="ghost">Export CSV</Button>
          <Button size="sm">Assign</Button>
          <Button variant="ghost" size="sm">Snooze</Button>
          <Button disabled>Disabled primary</Button>
          <Button variant="ghost" disabled>Disabled ghost</Button>
        </div>
      </Section>

      <Section title="StatusPill" hint="Six statuses on four signal hues; the label can be replaced while keeping the colour.">
        <div className="gl-row">
          {PILLS.map(s => <StatusPill key={s} status={s} />)}
        </div>
        <div className="gl-row">
          <StatusPill status="delayed">Delayed 3 h</StatusPill>
          <StatusPill status="at_risk">At risk · SLA 14:00</StatusPill>
          <StatusPill status="delivered">Delivered 09:12</StatusPill>
        </div>
      </Section>

      <Section title="KpiTile" hint="Label, big value, delta with its own tone, optional sparkline.">
        <div className="gl-kpis">
          <KpiTile label="On-time delivery" value="94.6%" delta={{ label: '2.1 pts vs last week', trend: 'up' }} sparkline={ON_TIME} />
          <KpiTile label="Delayed" value="37" delta={{ label: '9 need action', trend: 'up', tone: 'negative' }} sparkline={DELAYED} />
          <KpiTile label="Cost per kg" value="₹18.40" delta={{ label: '₹0.62 vs October', trend: 'down', tone: 'positive' }} sparkline={COST} />
          <KpiTile label="Active shipments" value="1,284" delta={{ label: 'same as yesterday', trend: 'flat' }} />
        </div>
        <div className="gl-kpis">
          <KpiTile label="No delta, no sparkline" value="12" />
          <KpiTile label="Delta only" value="6 h 20 m" delta={{ label: 'slower than target', trend: 'up', tone: 'negative' }} />
        </div>
      </Section>

      <Section title="Card" hint="Title left, meta right, body below. Flush cards drop the body padding for rows.">
        <div className="gl-cards">
          <Card title="Plain card">
            <p className="gl-body">Body copy sits on the surface token with normal leading. Nothing shouts except what needs action.</p>
          </Card>
          <Card title="With meta" meta="Last 7 days">
            <p className="gl-body">The meta slot takes a count, time range or LIVE tag.</p>
          </Card>
          <Card>
            <p className="gl-body">No header at all, just a body.</p>
          </Card>
        </div>
      </Section>

      <Section title="DataRow" hint="Label and hint on the left; value, mono value, or a trailing pill on the right.">
        <div className="gl-cards">
          <Card title="Needs attention" meta="3 of 37" flush>
            <DataRow label="PRG-10022" hint="Mumbai → Delhi" value="62%" trailing={<StatusPill status="delayed">Delayed 3 h</StatusPill>} />
            <DataRow label="PRG-10031" hint="Surat → Pune" value="48%" trailing={<StatusPill status="at_risk" />} />
            <DataRow label="PRG-10021" hint="Pune → Bengaluru" value="100%" trailing={<StatusPill status="delivered" />} />
          </Card>
          <Card title="Shipment PRG-10022" flush>
            <DataRow label="Tracking ID" value="PRG-10022" mono />
            <DataRow label="Booked" value="05 Nov 08:30" mono />
            <DataRow label="Chargeable weight" value="2.5 kg" />
            <DataRow label="Status" trailing={<StatusPill status="in_transit" />} />
            <DataRow label="Label only" />
          </Card>
        </div>
      </Section>
    </div>
  )
}
