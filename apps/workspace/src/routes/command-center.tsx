import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { CommandCenterScreen } from '@/screens/command-center/command-center-screen'

export const Route = createFileRoute('/command-center')({
  ssr: false,
  component: CommandCenterRoute,
})

function CommandCenterRoute() {
  usePageTitle('Command Center')
  return <CommandCenterScreen />
}
