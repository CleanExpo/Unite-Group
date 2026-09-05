/** Shared production/preview destinations. Unknown paths are never home aliases. */
export const MISSION_CONTROL_HOME = '/founder/command-centre'
export const MISSION_CONTROL_ALIASES = ['/', '/founder', '/dashboard', '/command-centre', '/mission-control', '/founder/dashboard', '/founder/workspace', '/founder/nexus-status'] as const

export const MISSION_CONTROL_ROUTES = [
  { section: 'home', href: MISSION_CONTROL_HOME, label: 'Home', primary: true },
  { section: 'operations', href: `${MISSION_CONTROL_HOME}/operations`, label: 'Operations', primary: true },
  { section: 'portfolio', href: `${MISSION_CONTROL_HOME}/portfolio`, label: 'Businesses', primary: true },
  { section: 'knowledge', href: `${MISSION_CONTROL_HOME}/knowledge`, label: 'Library & memory', primary: true },
  { section: 'campaigns', href: '/founder/campaigns', label: 'Campaigns', primary: false },
  { section: 'finance', href: '/founder/bookkeeper', label: 'Finance', primary: false },
  { section: 'providers', href: `${MISSION_CONTROL_HOME}/providers`, label: 'Connections', primary: true },
  { section: 'six-zone', href: `${MISSION_CONTROL_HOME}/six-zone`, label: 'System overview', primary: false },
  { section: 'wiki-graph', href: `${MISSION_CONTROL_HOME}/wiki-graph`, label: 'Knowledge graph', primary: false },
  { section: 'operator-gateway', href: `${MISSION_CONTROL_HOME}/operator-gateway`, label: 'Operator gateway', primary: false },
  { section: 'hermes-control-panel', href: `${MISSION_CONTROL_HOME}/hermes-control-panel`, label: 'Agent controls', primary: false },
  { section: 'studio', href: `${MISSION_CONTROL_HOME}/studio`, label: 'Design studio', primary: false },
] as const

export type MissionControlSection = typeof MISSION_CONTROL_ROUTES[number]['section']

export function getMissionControlSection(pathname: string): MissionControlSection | null {
  const path = pathname.replace(/\/$/, '')
  const route = MISSION_CONTROL_ROUTES.find(item => item.href === path)
  if (route) return route.section
  if (/^\/founder\/campaigns\/[^/]+$/.test(path)) return 'campaigns'
  return null
}
