import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('../MissionControlShell', () => ({
  MissionControlShell: ({ section, title, children }: { section: string; title?: string; children: ReactNode }) => (
    <main data-section={section}>{title && <h1>{title}</h1>}{children}</main>
  ),
}))
vi.mock('@/components/command-centre/wiki-graph/WikiGraphCanvas', () => ({ WikiGraphCanvas: () => <div>Graph canvas</div> }))
vi.mock('../studio/StudioClient', () => ({ StudioClient: ({ taskId }: { taskId: string }) => <button data-task-id={taskId}>Continue studio task</button> }))
vi.mock('@/components/command-centre/provider-accounts/ProviderAccountsTile', () => ({ ProviderAccountsTile: () => <button>Manage accounts</button> }))
vi.mock('@/components/command-centre/provider-usage/ProviderUsageCockpit', () => ({ ProviderUsageCockpit: () => <p>Provider usage unavailable</p> }))
vi.mock('@/components/command-centre/cost-allocation/CostAllocationTile', () => ({ CostAllocationTile: () => <p>Cost allocation unavailable</p> }))
vi.mock('@/components/command-centre/wiki-graph/WikiGraphTile', () => ({ WikiGraphTile: () => <a href="/founder/command-centre/wiki-graph">Open wiki graph</a> }))
vi.mock('@/components/command-centre/capability-registry/CapabilityRegistryTile', () => ({ CapabilityRegistryTile: () => <p>Capability registry unavailable</p> }))
vi.mock('../WikiEnhanceControl', () => ({ WikiEnhanceControl: () => <button>Enhance wiki</button> }))

import { ProvidersView } from '../providers/ProvidersView'
import { KnowledgeView } from '../knowledge/KnowledgeView'
import { WikiGraphView } from '../wiki-graph/WikiGraphView'
import { StudioView } from '../studio/StudioView'
import { HermesControlPanelView } from '../hermes-control-panel/HermesControlPanelView'
import { OperatorGatewayView } from '../operator-gateway/OperatorGatewayView'
import { getControlPanelView } from '@/lib/operator-gateway/control-panel'
import { MissionControlBoundary } from '../MissionControlBoundary'

afterEach(cleanup)

describe('Mission Control subpage presentations', () => {
  it('keeps the current workspace shell and retry action when its source fails', () => {
    const reset = vi.fn()
    const view = render(<MissionControlBoundary section="operations" error={new Error('Source unavailable')} reset={reset} />)
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'operations')
    expect(screen.getByRole('alert')).toHaveTextContent('Source unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledOnce()
    view.rerender(<MissionControlBoundary section="operations" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'operations')
  })
  it('keeps provider management controls and the usage and cost sources on their own page', () => {
    render(<ProvidersView />)
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'providers')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Providers')
    expect(screen.getByRole('button', { name: 'Manage accounts' })).toBeVisible()
    expect(screen.getByText('Provider usage unavailable')).toBeVisible()
    expect(screen.getByText('Cost allocation unavailable')).toBeVisible()
    expect(document.getElementById('providers')).not.toBeNull()
  })

  it('preserves library controls, the graph link and unavailable catalogue coverage', () => {
    render(<KnowledgeView tools={[]} catalogueUnavailable />)
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'knowledge')
    expect(screen.getByRole('button', { name: 'Enhance wiki' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open wiki graph' })).toHaveAttribute('href', '/founder/command-centre/wiki-graph')
    expect(screen.getByText('Tool catalogue unavailable in this environment')).toBeVisible()
    expect(document.getElementById('wiki-knowledge-base')).not.toBeNull()
    expect(document.getElementById('capability-bus')).not.toBeNull()
  })

  it('distinguishes an unavailable graph from a successfully read empty wiki', () => {
    const view = render(<WikiGraphView graph={null} error truncated={false} />)
    expect(screen.getByText('Wiki graph unavailable')).toBeVisible()
    expect(screen.queryByText('Wiki not synced')).not.toBeInTheDocument()
    expect(screen.queryByText('Graph canvas')).not.toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(2)
    view.rerender(<WikiGraphView graph={null} error={false} truncated={false} />)
    expect(screen.getByText('Wiki not synced')).toBeVisible()
  })

  it('retains the selected studio task identity and gives a useful missing-task state', () => {
    const view = render(<StudioView taskId="mission-123" />)
    expect(screen.getByRole('button', { name: 'Continue studio task' })).toHaveAttribute('data-task-id', 'mission-123')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    view.rerender(<StudioView />)
    expect(screen.getByText(/Open the studio from a routed idea/)).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('preserves the actual static Hermes inventory without claiming a live connection', () => {
    render(<HermesControlPanelView view={getControlPanelView()} />)
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'hermes-control-panel')
    expect(screen.getByText('Read-only foundation.')).toBeVisible()
    expect(screen.getByText('not connected — all external surfaces inert (by design)')).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('cannot dress an unavailable operator source as all-green gates or an empty queue', () => {
    render(<OperatorGatewayView view={null} jobEvents={[]} agentConnection={null} />)
    expect(screen.getByRole('main')).toHaveAttribute('data-section', 'operator-gateway')
    expect(screen.getByRole('status')).toHaveTextContent('Connect the authenticated operator sources')
    expect(screen.queryByText(/all gates green/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
