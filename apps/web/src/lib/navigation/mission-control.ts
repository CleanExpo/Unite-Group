/** Shared production/preview destinations. Unknown paths are never home aliases. */
export const MISSION_CONTROL_HOME = '/founder/command-centre'
export const MISSION_CONTROL_ALIASES = ['/', '/founder', '/dashboard', '/command-centre', '/mission-control', '/founder/dashboard', '/founder/workspace', '/founder/nexus-status'] as const

export const MISSION_CONTROL_ROUTES = [
  { section: 'home', href: MISSION_CONTROL_HOME, label: 'Home' },
  { section: 'operations', href: `${MISSION_CONTROL_HOME}/operations`, label: 'Operations' },
  { section: 'portfolio', href: `${MISSION_CONTROL_HOME}/portfolio`, label: 'Businesses' },
  { section: 'knowledge', href: `${MISSION_CONTROL_HOME}/knowledge`, label: 'Library & memory' },
  { section: 'campaigns', href: '/founder/campaigns', label: 'Campaigns' },
  { section: 'finance', href: '/founder/bookkeeper', label: 'Finance' },
  { section: 'providers', href: `${MISSION_CONTROL_HOME}/providers`, label: 'Connections' },
  { section: 'six-zone', href: `${MISSION_CONTROL_HOME}/six-zone`, label: 'System overview' },
  { section: 'wiki-graph', href: `${MISSION_CONTROL_HOME}/wiki-graph`, label: 'Knowledge graph' },
  { section: 'operator-gateway', href: `${MISSION_CONTROL_HOME}/operator-gateway`, label: 'Operator gateway' },
  { section: 'hermes-control-panel', href: `${MISSION_CONTROL_HOME}/hermes-control-panel`, label: 'Agent controls' },
  { section: 'studio', href: `${MISSION_CONTROL_HOME}/studio`, label: 'Design studio' },
] as const

export type MissionControlSection = typeof MISSION_CONTROL_ROUTES[number]['section']

export function getMissionControlSection(pathname: string): MissionControlSection | null {
  const path = pathname.replace(/\/$/, '')
  const route = MISSION_CONTROL_ROUTES.find(item => item.href === path)
  if (route) return route.section
  if (/^\/founder\/campaigns\/[^/]+$/.test(path)) return 'campaigns'
  return null
}
