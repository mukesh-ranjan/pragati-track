import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, type ExpressionSpecification, type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SlaRisk } from '../data/seed'
import { cx } from './cx'
import { useTheme, type Theme } from './ThemeToggle'
import { hubBounds, hubsGeoJson, lanesGeoJson, trucksGeoJson } from './networkGeometry'
import './NetworkMap.css'

/** OpenFreeMap vector styles: free, no API key. Dark for the night-shift theme, Positron for light. */
export const MAP_STYLES: Record<Theme, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

const RISK_LABELS: Record<SlaRisk, string> = { on_time: 'On time', at_risk: 'At risk', delayed: 'Delayed' }
const RISKS: SlaRisk[] = ['on_time', 'at_risk', 'delayed']

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Tracks the reduced-motion media query, re-rendering when the user flips it. */
function useReducedMotion(): boolean {
  const query = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null)
  const [reduced, setReduced] = useState(() => query()?.matches ?? false)
  useEffect(() => {
    const mq = query()
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Resolve a CSS token to its computed value; MapLibre paint properties cannot read var(). */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

type RiskColors = Record<SlaRisk, string>

function riskColors(): RiskColors {
  return { on_time: token('--color-teal'), at_risk: token('--color-warning'), delayed: token('--color-danger') }
}

/** A MapLibre `match` expression that picks the colour for a feature's `risk` property. */
function byRisk(colors: RiskColors): ExpressionSpecification {
  return ['match', ['get', 'risk'], 'on_time', colors.on_time, 'at_risk', colors.at_risk, colors.delayed]
}

/**
 * Add the hubs, lanes and trucks on top of whatever base style is loaded.
 * Runs again after every style swap (theme change), since a new style starts empty.
 */
function addOverlays(map: MapLibreMap, seconds: number): void {
  const colors = riskColors()
  const surface = token('--color-surface')
  const text = token('--color-text')
  const textMuted = token('--color-text-muted')

  map.addSource('lanes', { type: 'geojson', data: lanesGeoJson() })
  map.addSource('hubs', { type: 'geojson', data: hubsGeoJson() })
  map.addSource('trucks', { type: 'geojson', data: trucksGeoJson(seconds) })

  // A soft wide underlay gives the lanes a glow on the dark base without a real drop shadow.
  map.addLayer({
    id: 'lanes-glow',
    type: 'line',
    source: 'lanes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': byRisk(colors), 'line-width': 7, 'line-opacity': 0.18 },
  })
  map.addLayer({
    id: 'lanes',
    type: 'line',
    source: 'lanes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': byRisk(colors), 'line-width': 2.5, 'line-opacity': 0.95 },
  })
  map.addLayer({
    id: 'hubs',
    type: 'circle',
    source: 'hubs',
    paint: { 'circle-radius': 5, 'circle-color': text, 'circle-stroke-color': surface, 'circle-stroke-width': 2 },
  })
  map.addLayer({
    id: 'hub-labels',
    type: 'symbol',
    source: 'hubs',
    // Labels pick whichever side is free, so neighbours (Bengaluru/Chennai) do not collide.
    // Top-most symbol layers are placed first, so these win over the base map's city names.
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-variable-anchor': ['top', 'bottom', 'right', 'left'],
      'text-radial-offset': 0.7,
      'text-justify': 'auto',
    },
    paint: { 'text-color': textMuted, 'text-halo-color': surface, 'text-halo-width': 1.4 },
  })
  map.addLayer({
    id: 'trucks',
    type: 'circle',
    source: 'trucks',
    paint: { 'circle-radius': 5, 'circle-color': byRisk(colors), 'circle-stroke-color': surface, 'circle-stroke-width': 2 },
  })
}

export interface NetworkMapProps {
  className?: string
}

/**
 * Live network map: OpenFreeMap base tiles, the seeded hubs, lanes coloured by
 * SLA risk and trucks shuttling along them. The base style follows the theme;
 * the animation pauses under prefers-reduced-motion.
 */
export function NetworkMap({ className }: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const styleRef = useRef<string>('')
  const startRef = useRef(0)
  const [theme] = useTheme()
  const reduced = useReducedMotion()
  const [state, setState] = useState<'loading' | 'ready' | 'unsupported'>('loading')

  // Seconds since the map was created; drives the truck positions.
  const elapsed = () => (performance.now() - startRef.current) / 1000

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const style = MAP_STYLES[theme]
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: el,
        style,
        bounds: hubBounds() as LngLatBoundsLike,
        fitBoundsOptions: { padding: { top: 36, right: 48, bottom: 56, left: 48 } },
        attributionControl: { compact: false },
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        fadeDuration: 0,
      })
    } catch {
      // No WebGL (old GPU, headless without a GL backend, jsdom): keep the card useful.
      setState('unsupported')
      return
    }
    startRef.current = performance.now()
    styleRef.current = style
    mapRef.current = map
    map.on('style.load', () => addOverlays(map, elapsed()))
    // 'load' fires once the first style, tiles and glyphs have rendered. ('idle' would never
    // fire: the truck animation keeps the map repainting every frame.)
    map.once('load', () => setState('ready'))
    return () => {
      map.remove()
      mapRef.current = null
    }
    // The map is created once; theme changes swap the style below.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Swap the base style when the theme flips. diff:false forces a full reload so 'style.load' refires.
  useEffect(() => {
    const map = mapRef.current
    const style = MAP_STYLES[theme]
    if (!map || styleRef.current === style) return
    styleRef.current = style
    map.setStyle(style, { diff: false })
  }, [theme])

  // Move the trucks every frame, unless the user asked for less motion. Starts only once the
  // map has fired 'load': updating a source every frame keeps it "loading", which would
  // otherwise stop 'load' from ever firing.
  useEffect(() => {
    const map = mapRef.current
    if (!map || reduced || state !== 'ready' || typeof requestAnimationFrame !== 'function') return
    let frame = 0
    const tick = () => {
      const source = map.getSource('trucks') as GeoJSONSource | undefined
      if (source) source.setData(trucksGeoJson(elapsed()))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, state])

  return (
    <div
      className={cx('pt-map', className)}
      data-state={state}
      data-motion={reduced ? 'paused' : 'running'}
      role="region"
      aria-label="Live network map: hubs, lanes coloured by SLA risk, and trucks in motion"
    >
      <div ref={containerRef} className="pt-map__canvas" />
      {state === 'unsupported' && (
        <div className="pt-map__fallback">
          Live map needs WebGL, which this browser has turned off.
        </div>
      )}
      {reduced && state === 'ready' && <span className="pt-map__paused">Motion paused</span>}
      <ul className="pt-map__legend" aria-label="SLA risk">
        {RISKS.map(risk => (
          <li key={risk}>
            <span className={`pt-map__swatch pt-map__swatch--${risk}`} aria-hidden="true" />
            {RISK_LABELS[risk]}
          </li>
        ))}
      </ul>
    </div>
  )
}
