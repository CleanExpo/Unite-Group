// /docs — Nexus API documentation viewer (OpenAPI 3.1)

export const metadata = {
  title: 'Nexus API Docs',
  description: 'Unite-Group Nexus — Mission Control API documentation',
}

export default function DocsPage() {
  return (
    <main style={{ fontFamily: 'ui-monospace, monospace', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nexus API</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Unite-Group Nexus — Mission Control platform API &mdash; v1.0.0
      </p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          POST /api/work
        </h2>
        <p style={{ margin: '0.75rem 0', color: '#444' }}>
          Accepts a plain-English work description and classifies it by target system and work type using
          an LLM-based intent classifier. Returns a structured routing intent for queuing into the correct
          portfolio system.
        </p>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1.25rem' }}>Request body</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>{`{
  "description": string,   // required — plain-English work description (max 4,000 chars)
  "context": string        // optional — additional context for better classification
}`}</pre>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1.25rem' }}>Response — 200 OK</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>{`{
  "intent": {
    "system":   "RestoreAssist" | "Synthex" | "Nexus",
    "workType": "bug" | "feature" | "infra"
  },
  "confidence":    number,  // 0.0–1.0 classifier confidence
  "suggestedTitle": string  // concise action-oriented title (max 80 chars)
}`}</pre>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1.25rem' }}>Systems</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #ddd' }}>System</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #ddd' }}>Domain</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 600 }}>RestoreAssist</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Disaster recovery, backup management, client DR plans</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 600 }}>Synthex</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Social media automation, post scheduling, platform integrations</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 600 }}>Nexus</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Core platform — CRM, analytics, billing, command centre, dashboards</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1.25rem' }}>Example request</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>{`POST /api/work
Content-Type: application/json

{
  "description": "The social media scheduler isn't posting to Instagram at the scheduled time"
}`}</pre>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem' }}>Example response</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>{`{
  "intent": { "system": "Synthex", "workType": "bug" },
  "confidence": 0.95,
  "suggestedTitle": "Fix Instagram post scheduling failure"
}`}</pre>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          OpenAPI Specification
        </h2>
        <p style={{ margin: '0.75rem 0', color: '#444' }}>
          Machine-readable OpenAPI 3.1 spec available at{' '}
          <a href="/api/openapi" style={{ color: '#0066cc' }}>/api/openapi</a>.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          Authentication
        </h2>
        <p style={{ margin: '0.75rem 0', color: '#444' }}>
          All endpoints require a valid Supabase session (cookie-based). Sign in via{' '}
          <code>/sign-in</code> to obtain a session.
        </p>
      </section>
    </main>
  )
}
