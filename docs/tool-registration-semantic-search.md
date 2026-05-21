# Pi-CEO + Margot Tool Registration

## New Tools Added (2026-05-20)

### 1. semantic_search (Pi-CEO)
- **Location**: scripts/pi-ceo-semantic-search-wrapper.ts
- **RPC**: `semantic_search(query_embedding, match_count, similarity_threshold)`
- **Purpose**: First-class vector search over the entire Nexus knowledge base
- **Status**: Registered and ready for Pi-CEO tool scheduler

### 2. margot_semantic_search (Margot)
- **Location**: scripts/margot-semantic-search-wrapper.ts
- **Purpose**: High-level synthesis-friendly wrapper for Margot
- **Helper**: `getRelevantBrainContext()` for quick research grounding
- **Status**: Ready for Margot turn pipeline

## Integration Points

- Both tools are now part of the **schema-layer.md** wrapper
- Agents must prefer `semantic_search` over direct file reads for speed
- Future Hermes / Pi-CEO updates should expose these as callable tools

## Next Steps
- Expose via Pi-CEO tool registry
- Add to Margot MCP pipeline
- Add self-test query in the next auto-run cycle

Last updated: 2026-05-20