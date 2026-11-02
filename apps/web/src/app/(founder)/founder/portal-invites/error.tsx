'use client'

export default function PortalInvitesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" style={{ padding: 24 }}>
      <p>Invite codes could not load. No code was made or cancelled.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  )
}
