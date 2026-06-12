---
type: wiki
updated: 2026-05-11
---

# Floor Plan Workstream

Cross-product epic delivering pre-loaded floor plans + IICRC-compliant damage overlay to field technicians **before** they arrive on site. Parent epic RA-2947 in the `RestoreAssist V2 — Sketch & Property Data` Linear project. Sub-epic RA-2970 covers the LiDAR + GPS-stitch path.

## Goal

When a [[restore-assist]] technician opens a job, the property's floor plan is already on screen. Tech taps walls / doors to confirm or correct. PencilKit overlay applies IICRC damage categories (S500 Cat 1/2/3 water, S520 mould Condition 1/2/3, S540 trauma, etc.). Output exports to NIR-compliant PDF for [[loss-adjusters|loss adjusters]] and Xactimate JSON for insurance estimating.

## Inputs (acquisition priority order)

1. **Apple RoomPlan + LiDAR** (iPhone Pro / iPad Pro) — fastest, no scrape risk. See `Sources/Completed/LiDAR 3D Floor Plan Creator App.md` and `Sources/Completed/RoomScan Pro LiDAR.md`.
2. **GPS-stitched perimeter** — RA-2970 sub-epic. Walk the perimeter, GPS-stitch coordinates, infer building footprint. Used when LiDAR unavailable indoors.
3. **Encircle-style video sketch** — smartphone video → professional floor plan in <6h. See `Sources/Completed/Encircle Field Documentation Software Tour - Product Overview.md` and `Sources/Completed/Master Day 1 Visual Documentation with Encircle 2024 - Webinar.md`.
4. **Listing scrape** (realestate.com.au / domain.com.au) — RA-2951, owner-gated due to ToS risk. Not autonomous.
5. **Manual sketch** — fallback, via DrawPlan-style tooling. See `Sources/Completed/DrawPlan – Draw your floor plan.md`, `Sources/Completed/Planner 5D House Design Software Home Design in 3D.md`, `Sources/Completed/Floor Plan & Sketching App for Restoration.md`.

## Sub-epic: RA-2970 LiDAR + GPS-Stitch

Parent: RA-2970. Children: RA-2954, RA-2971, RA-2972, RA-2973, RA-2974. Builds the highest-priority acquisition path (Apple RoomPlan + GPS-stitch). Status tracked in [[now]].

## Shipped (week of 2026-05-05)

| Ticket | What | PR |
|---|---|---|
| RA-2966 | ✅ | #937 |
| RA-2967 | ✅ | #938 |
| RA-2975 | ✅ | #939 (stacked on #937) |

## Cross-Product Value

- **[[restore-assist]]** — primary consumer. Faster field documentation, fewer typos, IICRC-compliant overlay built-in.
- **[[dr-nrpg]]** — site differentiator. "Floor plan ready before the tech rolls" is a unique selling claim against TPAs.
- **[[carsi]]** — feeds certification training. Module 7 "Field documentation" becomes a live walkthrough of the workflow.
- **[[industry-association-vision-2026]]** — equipment marketplace ties [[ccw]] hardware (moisture meters, thermal imagers) to the floor plan overlay.

## Competitive Reference

Encircle, DocuSketch, Magicplan, Planner 5D, RoomScan Pro, 4plan, DrawPlan. Encircle is the workflow benchmark (smartphone video → Xactimate JSON, <6h). The [[4plan-designer]] candidate sits in the same category but targets renovation rather than restoration.

## GPS-Stitch Architectural Lesson (Uber H3)

Source: `Sources/The Genius System Behind the Uber App's Real-Time Map.md`. RA-2970 currently plans GPS-stitched perimeter via raw coordinate distance maths. Uber's lesson is the opposite — at scale, distance-to-every-point is O(N) and unmanageable. Their fix:

- **H3** (open-source hexagonal spatial index, `uber/h3`) — divides any geographic region into hexagons; each hex has equal distance to every neighbour (no square-grid corner bias).
- Map a GPS coordinate → H3 index. Query the **K-ring** (neighbours within K steps) instead of computing distances.
- Brings nearby-points lookup from O(N) → O(K² + M) where M = local hits.

**Why it matters for RA-2970:** the field-tech perimeter walk often happens around a multi-unit complex where one tech is stitching their unit while another is on an adjacent unit. Indexing both perimeters into H3 cells lets the backend dedupe walls, infer party-walls, and avoid double-counting damage area. Adds a useful primitive for future fleet-routing if [[restore-assist]] later adds tech dispatch.

**Dead-reckoning + Kalman filter** — Uber smooths sparse GPS pings into continuous car positions using last known speed/direction + Kalman fusion. Same maths applies to GPS-stitch when the tech's phone loses satellite lock indoors — predict the next wall corner from the last few, blend with whatever measurement returns. Lift directly into RA-2970 spec rather than rolling our own predictor.

Cross-ref filed in [[tech-drops-q2-2026]] (system-design notes section).

## Open Risks

- RA-2951 (listing scrape) — realestate.com.au / domain.com.au ToS risk; founder-gated, never autonomous
- IICRC standards copyright — overlay categories reference S500/S520/S540 nomenclature; safe within fair use, but verbatim text in tooltips needs the [[iicrc-content-initiative]] safe-harbour ruling

## Educational Resources

*   **The Mindful Builder Network:** General industry insights and construction best practices. [YouTube channel: The Mindful Builder Network] ![](https://www.youtube.com/watch?v=embed)

## Cross-refs

[[restore-assist]] · [[dr-nrpg]] · [[carsi]] · [[loss-adjusters]] · [[iicrc-content-initiative]] · [[industry-association-vision-2026]] · [[now]]