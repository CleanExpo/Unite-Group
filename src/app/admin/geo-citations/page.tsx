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

export default function GeoCitationsAdminPage() {
  const [events, setEvents] = useState<GeoCitationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  // Filters
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">GEO Citation Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Admin only · Dark run · Sprint 4 · {total} total events
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Brand Mentioned</label>
          <select
            value={filterMentioned}
            onChange={(e) => { setFilterMentioned(e.target.value as "all" | "yes" | "no"); setPage(0) }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search Engine</label>
          <select
            value={filterEngine}
            onChange={(e) => { setFilterEngine(e.target.value); setPage(0) }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="google_ai_overview">Google AI Overview</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="perplexity">Perplexity</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0) }}
            className="text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(0) }}
            className="text-sm border rounded px-2 py-1"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Query</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Variant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mentioned</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Snippet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No events found
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className={event.brand_mentioned ? "bg-green-50" : ""}>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                    {event.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">{event.query_text}</td>
                  <td className="px-4 py-2 text-center">{event.query_variant}</td>
                  <td className="px-4 py-2">{event.query_date}</td>
                  <td className="px-4 py-2 text-center">
                    {event.brand_mentioned ? (
                      <span className="text-green-600 font-medium">
                        ✓ pos {event.mention_position}
                      </span>
                    ) : event.error_reason ? (
                      <span className="text-red-500 text-xs" title={event.error_reason}>
                        Error
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-sm truncate text-gray-500 text-xs">
                    {event.raw_snippet || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page + 1} of {totalPages} ({total} events)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
