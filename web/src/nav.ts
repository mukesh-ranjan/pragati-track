import type { SidebarItem } from './components'

/** Control-tower navigation, shared by every page that renders the sidebar. */
export const NAV: SidebarItem[] = [
  { label: 'Overview', to: '/' },
  { label: 'Shipments', to: '/track' },
  { label: 'Live map' },
  { label: 'Exceptions' },
  { label: 'Analytics' },
  { label: 'Ask Pragati AI' },
  { label: 'Settings' },
]
