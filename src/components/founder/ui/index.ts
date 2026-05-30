/**
 * Layered UI Primitives — Barrel Export
 * UNI-2060 Phase 2 + remaining deferred primitives + CRM composites
 */

export { Card } from './Card';
export type { CardProps } from './Card';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { KPI } from './KPI';
export type { KPIProps } from './KPI';

export { Tier } from './Tier';
export type { TierProps } from './Tier';

export { HealthBar } from './HealthBar';
export type { HealthBarProps } from './HealthBar';

export { FAB } from './FAB';
export type { FABProps } from './FAB';

export { LiveIndicator } from './LiveIndicator';
export type { LiveIndicatorProps } from './LiveIndicator';

// Deferred primitives — completed in follow-up slice
export { Ticker } from './Ticker';
export type { TickerProps } from './Ticker';

export { Sidebar } from './Sidebar';
export type { SidebarProps } from './Sidebar';

export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';

export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';

export { StackShadow } from './StackShadow';
export type { StackShadowProps } from './StackShadow';

// CRM composite cards — built on primitives above
export { LeadCard } from './LeadCard';
export type { LeadCardProps } from './LeadCard';

export { OpportunityCard } from './OpportunityCard';
export type { OpportunityCardProps } from './OpportunityCard';
