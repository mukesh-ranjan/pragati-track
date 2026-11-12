import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PILL_STATUSES, StatusPill, type PillStatus } from './StatusPill'

afterEach(cleanup)

describe('StatusPill', () => {
  it('renders a human label for every status', () => {
    const expected: Record<PillStatus, string> = {
      delivered: 'Delivered',
      in_transit: 'In transit',
      out_for_delivery: 'Out for delivery',
      at_risk: 'At risk',
      delayed: 'Delayed',
      exception: 'Exception',
    }
    for (const [status, label] of Object.entries(expected) as [PillStatus, string][]) {
      render(<StatusPill status={status} />)
      expect(screen.getByText(label)).toBeTruthy()
      cleanup()
    }
  })

  it('maps each status onto one of the four signal hues', () => {
    const tones: Record<PillStatus, string> = {
      delivered: 'success',
      in_transit: 'info',
      out_for_delivery: 'info',
      at_risk: 'warning',
      delayed: 'danger',
      exception: 'danger',
    }
    for (const [status, tone] of Object.entries(tones) as [PillStatus, string][]) {
      const { container } = render(<StatusPill status={status} />)
      const pill = container.firstElementChild as HTMLElement
      expect(pill.classList.contains(`pt-pill--${tone}`)).toBe(true)
      expect(pill.dataset.status).toBe(status)
      expect(PILL_STATUSES[status].tone).toBe(tone)
      cleanup()
    }
  })

  it('lets a custom label override the default while keeping the colour', () => {
    const { container } = render(<StatusPill status="delayed">Delayed 3 h</StatusPill>)
    expect(screen.getByText('Delayed 3 h')).toBeTruthy()
    expect(screen.queryByText('Delayed')).toBeNull()
    expect((container.firstElementChild as HTMLElement).classList.contains('pt-pill--danger')).toBe(true)
  })

  it('hides the decorative dot from assistive tech', () => {
    const { container } = render(<StatusPill status="delivered" />)
    const dot = container.querySelector('.pt-pill__dot')
    expect(dot?.getAttribute('aria-hidden')).toBe('true')
  })
})
