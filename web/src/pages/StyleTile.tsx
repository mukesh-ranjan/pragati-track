import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './style-tile.css'

type Theme = 'dark' | 'light'

const BRAND = [
  '--navy-950', '--navy-900', '--navy-800', '--navy-700', '--navy-600',
  '--saffron-500', '--saffron-400', '--teal-400', '--teal-500',
  '--red-400', '--red-500', '--green-400', '--green-500', '--amber-400', '--blue-400',
]

const SEMANTIC = [
  '--color-bg', '--color-surface', '--color-surface-raised', '--color-surface-sunken',
  '--color-border', '--color-border-strong',
  '--color-text', '--color-text-muted', '--color-text-faint', '--color-text-on-accent',
  '--color-accent', '--color-accent-hover', '--color-accent-soft',
  '--color-teal', '--color-teal-soft',
  '--color-danger', '--color-danger-soft', '--color-success', '--color-success-soft',
  '--color-warning', '--color-warning-soft', '--color-info', '--color-info-soft', '--color-focus',
]

const STATUS = ['booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception']

const TYPE = ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl']
const WEIGHTS = ['--weight-regular', '--weight-medium', '--weight-semibold', '--weight-bold', '--weight-black']
const SPACE = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12', '--space-16']
const RADIUS = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-pill']
const DURATIONS = ['--duration-fast', '--duration-base', '--duration-slow']
const EASINGS = ['--ease-standard', '--ease-out', '--ease-spring']
const MISC = ['--font-sans', '--font-mono', '--leading-tight', '--leading-normal', '--tracking-caps', '--sidebar-width', '--content-max', '--shadow-card', '--gradient-saffron', '--color-accent-glow']

function useTokenValues(theme: Theme): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    const all = [...BRAND, ...SEMANTIC, ...TYPE, ...WEIGHTS, ...SPACE, ...RADIUS, ...DURATIONS, ...EASINGS, ...MISC,
      ...STATUS.map(s => `--status-${s}`)]
    const next: Record<string, string> = {}
    for (const name of all) next[name] = cs.getPropertyValue(name).trim()
    setValues(next)
  }, [theme])
  return values
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="st-swatch">
      <div className="st-swatch__chip" style={{ background: `var(${name})` }} />
      <code className="st-swatch__name">{name}</code>
      <span className="st-swatch__value">{value}</span>
    </div>
  )
}

export default function StyleTile() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const v = useTokenValues(theme)
  const [pulse, setPulse] = useState(false)

  return (
    <div className="st">
      <header className="st-header">
        <div>
          <p className="st-eyebrow">Pragati Track · design tokens</p>
          <h1 className="st-title">Style tile</h1>
          <p className="st-sub">Every variable from <code>src/styles/tokens.css</code>, rendered live in the current theme.</p>
        </div>
        <div className="st-header__actions">
          <Link className="st-link" to="/">← Tracking page</Link>
          <div className="st-toggle" role="group" aria-label="Theme">
            <button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}>Dark</button>
            <button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}>Light</button>
          </div>
        </div>
      </header>

      <section className="st-section">
        <h2>Brand palette</h2>
        <div className="st-grid">{BRAND.map(n => <Swatch key={n} name={n} value={v[n] ?? ''} />)}</div>
        <div className="st-gradient">
          <div className="st-gradient__bar" />
          <code>--gradient-saffron</code>
          <span className="st-swatch__value">{v['--gradient-saffron']}</span>
        </div>
      </section>

      <section className="st-section">
        <h2>Semantic colour <small>({theme})</small></h2>
        <div className="st-grid">{SEMANTIC.map(n => <Swatch key={n} name={n} value={v[n] ?? ''} />)}</div>
      </section>

      <section className="st-section">
        <h2>Status pills</h2>
        <div className="st-row">
          {STATUS.map(s => (
            <span key={s} className="st-pill" style={{ color: `var(--status-${s})` }}>
              {s}
            </span>
          ))}
        </div>
        <div className="st-grid st-grid--tight">
          {STATUS.map(s => <Swatch key={s} name={`--status-${s}`} value={v[`--status-${s}`] ?? ''} />)}
        </div>
      </section>

      <section className="st-section">
        <h2>Typography</h2>
        <div className="st-fonts">
          <div>
            <code>--font-sans</code>
            <p className="st-sample" style={{ fontFamily: 'var(--font-sans)' }}>Plus Jakarta Sans — Good morning, Ravi. 1,284 active shipments across India.</p>
          </div>
          <div>
            <code>--font-mono</code>
            <p className="st-sample" style={{ fontFamily: 'var(--font-mono)' }}>JetBrains Mono — PRG-10022 · 05 Nov 08:30 · search_shipments(destination="Pune")</p>
          </div>
        </div>
        <div className="st-type">
          {TYPE.map(n => (
            <div key={n} className="st-type__row">
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
              <span className="st-type__sample" style={{ fontSize: `var(${n})` }}>On-time delivery 94.6%</span>
            </div>
          ))}
        </div>
        <div className="st-type">
          {WEIGHTS.map(n => (
            <div key={n} className="st-type__row">
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
              <span className="st-type__sample" style={{ fontWeight: `var(${n})` as never }}>Needs attention · sorted by SLA risk</span>
            </div>
          ))}
        </div>
        <div className="st-type">
          <div className="st-type__row">
            <code>--tracking-caps</code>
            <span className="st-swatch__value">{v['--tracking-caps']}</span>
            <span className="st-type__sample st-caps">On-time delivery</span>
          </div>
          <div className="st-type__row">
            <code>--leading-tight</code>
            <span className="st-swatch__value">{v['--leading-tight']}</span>
            <span className="st-type__sample" style={{ lineHeight: 'var(--leading-tight)' }}>Tight leading for KPI numbers<br />and two-line titles.</span>
          </div>
          <div className="st-type__row">
            <code>--leading-normal</code>
            <span className="st-swatch__value">{v['--leading-normal']}</span>
            <span className="st-type__sample" style={{ lineHeight: 'var(--leading-normal)' }}>Normal leading for body copy<br />and AI answers.</span>
          </div>
        </div>
      </section>

      <section className="st-section">
        <h2>Spacing</h2>
        <div className="st-type">
          {SPACE.map(n => (
            <div key={n} className="st-type__row">
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
              <span className="st-space" style={{ width: `var(${n})` }} />
            </div>
          ))}
          <div className="st-type__row"><code>--sidebar-width</code><span className="st-swatch__value">{v['--sidebar-width']}</span><span /></div>
          <div className="st-type__row"><code>--content-max</code><span className="st-swatch__value">{v['--content-max']}</span><span /></div>
        </div>
      </section>

      <section className="st-section">
        <h2>Radius &amp; elevation</h2>
        <div className="st-row">
          {RADIUS.map(n => (
            <div key={n} className="st-radius">
              <div className="st-radius__box" style={{ borderRadius: `var(${n})` }} />
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
            </div>
          ))}
        </div>
        <div className="st-row">
          <div className="st-card">
            <code>--shadow-card</code>
            <span className="st-swatch__value">{v['--shadow-card']}</span>
          </div>
          <div className="st-card st-card--glow">
            <code>--color-accent-glow</code>
            <span className="st-swatch__value">{v['--color-accent-glow']}</span>
          </div>
        </div>
      </section>

      <section className="st-section">
        <h2>Motion</h2>
        <p className="st-sub">Hover each block to see the duration; the dot pulses with <code>--duration-slow</code>.</p>
        <div className="st-row">
          {DURATIONS.map(n => (
            <div key={n} className="st-motion" style={{ transitionDuration: `var(${n})` }}>
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
            </div>
          ))}
        </div>
        <div className="st-row">
          {EASINGS.map(n => (
            <div key={n} className="st-motion" style={{ transitionTimingFunction: `var(${n})`, transitionDuration: 'var(--duration-slow)' }}>
              <code>{n}</code>
              <span className="st-swatch__value">{v[n]}</span>
            </div>
          ))}
        </div>
        <div className="st-row">
          <span className="st-live"><span className="st-live__dot" />LIVE</span>
          <button className="st-btn" onClick={() => setPulse(p => !p)}>{pulse ? 'Pulsed' : '+ New shipment'}</button>
          <button className="st-btn st-btn--ghost">Secondary</button>
        </div>
      </section>

      <section className="st-section">
        <h2>Components in context</h2>
        <div className="st-kpis">
          <div className="st-kpi">
            <span className="st-caps">On-time delivery</span>
            <strong>94.6%</strong>
            <span className="st-delta st-delta--up">▲ 2.1 pts vs last week</span>
          </div>
          <div className="st-kpi">
            <span className="st-caps">Delayed</span>
            <strong>37</strong>
            <span className="st-delta st-delta--down">▼ 9 need action</span>
          </div>
          <div className="st-kpi">
            <span className="st-caps">Cost per kg</span>
            <strong>₹18.40</strong>
            <span className="st-delta st-delta--up">▼ ₹0.62 vs October</span>
          </div>
        </div>
        <div className="st-card st-card--list">
          <div className="st-list__row">
            <code className="st-id">PRG-10022</code>
            <span>Mumbai → Delhi</span>
            <span className="st-bar"><span style={{ width: '62%' }} /></span>
            <span className="st-pill" style={{ color: 'var(--color-danger)' }}>Delayed 3 h</span>
          </div>
          <div className="st-list__row">
            <code className="st-id">PRG-10031</code>
            <span>Surat → Pune</span>
            <span className="st-bar"><span style={{ width: '48%' }} /></span>
            <span className="st-pill" style={{ color: 'var(--color-warning)' }}>At risk</span>
          </div>
          <div className="st-list__row">
            <code className="st-id">PRG-10021</code>
            <span>Pune → Bengaluru</span>
            <span className="st-bar"><span style={{ width: '100%' }} /></span>
            <span className="st-pill" style={{ color: 'var(--color-success)' }}>Delivered</span>
          </div>
        </div>
      </section>
    </div>
  )
}
