"use client"

/**
 * Admin: GEO Citation Monitor Dashboard — SYN-584
 * Phill-only view. Dark run Sprint 4 — no client access.
 *
 * Shows citation events with filter by user, date range, engine, brand_mentioned.
 * 50 rows per page.
 */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface GeoCitationEvent {
  id: string
  user_id: string
  query_text: string
  search_engine: string
  query_date: string
  brand_mentioned: boolean
  raw_snippet: string | null
  mention_position: number | null
  query_variant: number
  error_reason: string | null
  created_at: string
}

const PAGE_SIZE = 50

const selectStyle: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #27272a",
  color: "#fafafa",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  outline: "none",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#52525b",
  marginBottom: 6,
}

export default function GeoCitationsAdminPage() {
  const [events, setEvents] = useState<GeoCitationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const [filterMentioned, setFilterMentioned] = useState<"all" | "yes" | "no">("all")
  const [filterEngine, setFilterEngine] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [page, filterMentioned, filterEngine, filterDateFrom, filterDateTo])

  async function loadEvents() {
    setLoading(true)
    setError(null)

    try {
      let query = (supabase as any)
        .from("geo_citation_events")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterMentioned === "yes") query = query.eq("brand_mentioned", true)
      if (filterMentioned === "no") query = query.eq("brand_mentioned", false)
      if (filterEngine !== "all") query = query.eq("search_engine", filterEngine)
      if (filterDateFrom) query = query.gte("query_date", filterDateFrom)
      if (filterDateTo) query = query.lte("query_date", filterDateTo)

      const { data, count, error: queryError } = await query

      if (queryError) throw queryError
      setEvents(data || [])
      setTotal(count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 4 }}>GEO Citation Monitor</h1>
          <p style={{ fontSize: 12, color: "#52525b", fontFamily: "var(--font-mono, monospace)" }}>
            Admin only · Dark run · Sprint 4 · {total} total events
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 16, marginBottom: 24, padding: 20, background: "#111113", border: "1px solid #27272a", borderRadius: 10 }}>
          <div>
            <label style={labelStyle}>Brand Mentioned</label>
            <select
              value={filterMentioned}
              onChange={(e) => { setFilterMentioned(e.target.value as "all" | "yes" | "no"); setPage(0) }}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Search Engine</label>
            <select
              value={filterEngine}
              onChange={(e) => { setFilterEngine(e.target.value); setPage(0) }}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="google_ai_overview">Google AI Overview</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0) }}
              style={selectStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(0) }}
              style={selectStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #27272a" }}>
                  {["User ID", "Query", "Variant", "Date", "Mentioned", "Snippet"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#52525b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#52525b" }}>Loading...</td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#52525b" }}>No events found</td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} style={{ borderBottom: "1px solid #27272a", background: event.brand_mentioned ? "rgba(22,163,74,0.04)" : "transparent" }}>
                      <td style={{ padding: "10px 16px", color: "#52525b", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
                        {event.user_id.slice(0, 8)}…
                      </td>
                      <td style={{ padding: "10px 16px", color: "#d4d4d8", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.query_text}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", color: "#a1a1aa", fontFamily: "var(--font-mono, monospace)" }}>{event.query_variant}</td>
                      <td style={{ padding: "10px 16px", color: "#a1a1aa", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{event.query_date}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        {event.brand_mentioned ? (
                          <span style={{ color: "#16a34a", fontWeight: 500, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                            pos {event.mention_position}
                          </span>
                        ) : event.error_reason ? (
                          <span style={{ color: "#dc2626", fontSize: 11 }} title={event.error_reason}>Error</span>
                        ) : (
                          <span style={{ color: "#27272a" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#52525b", fontSize: 12, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.raw_snippet || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#52525b", fontFamily: "var(--font-mono, monospace)" }}>
              Page {page + 1} of {totalPages} ({total} events)
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ padding: "6px 14px", fontSize: 13, background: "transparent", border: "1px solid #27272a", borderRadius: 6, color: "#a1a1aa", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ padding: "6px 14px", fontSize: 13, background: "transparent", border: "1px solid #27272a", borderRadius: 6, color: "#a1a1aa", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
