// /[locale]/command-center — Unite-Group operations cockpit.
//
// Per [[command-center-redesign-proposal-2026-05-14]], this route is the
// new wow-factor build that replaces the long-form /empire dashboard.
// PR-1 ships Zones 1 + 2 LIVE plus labeled placeholders for Zones 3/4/5
// so Phill can see the target shape immediately.
//
// PR-2 adds Zone 3 (agent topology, @xyflow/react + tsParticles).
// PR-3 adds Zones 4 + 5 (Business 360 sparklines + live activity log).

import { CommandCenterShell } from '@/components/command-center/CommandCenterShell';

export const dynamic = 'force-dynamic';

export default function CommandCenterPage() {
  return <CommandCenterShell />;
}
