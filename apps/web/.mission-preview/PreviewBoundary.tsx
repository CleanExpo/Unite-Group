import React from 'react'

export class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <section className="previewRecovery" aria-labelledby="preview-render-title"><div>
        <h1 id="preview-render-title">Mission Control encountered a problem</h1>
        <p role="alert">This workspace could not be displayed. Reload the local preview to try again.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload Mission Control</button>
        <p className="previewRecoveryHint">Local design preview. Reloading may discard unsaved sample drafts.</p>
      </div></section>
    }
    return this.props.children
  }
}
