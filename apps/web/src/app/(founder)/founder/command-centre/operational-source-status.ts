type ReadState = { read_error: string | null }

export function getOperationalSourceStatus(actionQueue: ReadState, blockedLanes: ReadState) {
  const queueUnavailable = Boolean(actionQueue.read_error)
  const blockersUnavailable = Boolean(blockedLanes.read_error)
  const unavailable = queueUnavailable || blockersUnavailable

  return {
    queueUnavailable,
    blockersUnavailable,
    unavailable,
    label: unavailable ? 'Queue or lane read unavailable' : 'Queue and lane reads available',
  }
}
