export const MISSION_CONTROL_NEXT_TABS = ['home', 'missions', 'world', 'portfolio', 'evidence'] as const;
export type MissionControlNextTab = (typeof MISSION_CONTROL_NEXT_TABS)[number];

export function parseTab(value: string | undefined): MissionControlNextTab {
  return (MISSION_CONTROL_NEXT_TABS as readonly string[]).includes(value ?? '')
    ? (value as MissionControlNextTab)
    : 'home';
}
