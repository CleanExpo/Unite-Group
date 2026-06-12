---
type: wiki
updated: 2026-05-11
---

# Loss Adjusters

The demand side of the ANZ restoration market. Loss adjusters and Third Party Administrators (TPAs) scope and approve insurance claims; their workflow tools and panel decisions determine which contractors win work. Owning the data they need is a structural lever for [[dr-nrpg]] and [[restore-assist]].

## Source Material

- `Sources/Completed/Loss Adjusters.md` — folder index referencing Sedgwick MCL (Major Catastrophic Loss) team, downloaded 2026-05-11
- `Sources/Completed/Leading source of information about insurance risk.md` — Verisk (US-listed insurance-risk data provider, the industry's spine)
- Google Cloud Blog — Provides advanced data analytics capabilities, including BigQuery geospatial analysis, Earth Engine raster analytics, and Google Earth AI models, which are increasingly relevant for large-scale damage assessment and risk modeling.

## Why They Matter

| Role | Influence |
|---|---|
| Loss adjuster | Inspects damage, writes scope, approves cost. Their NIR PDF + Xactimate JSON outputs are the deliverables. |
| TPA (Third Party Administrator) | Manages claim end-to-end on behalf of insurer; allocates contractors from panel. Sedgwick is the global benchmark; OnCORE is the [[restoration-industry-context|RIA-ranked]] #1 in 2025 for the third consecutive year. |
| Insurer | Final approver; consumes adjuster + TPA reporting. Pays the bill. |
| Verisk | Data layer underneath — claims history, peril modelling, fraud detection. Their format dictates downstream tooling. |

## Workflow Output Standards

Loss adjusters and TPAs require:
- **NIR PDF** — National Insurance Report format, the AU standard deliverable
- **Xactimate JSON** — industry-standard cost-estimating output; without it, work doesn't get paid
- **IICRC standards reference** — every line item maps to an S-standard (S500 water, S520 mould, S540 trauma). See [[iicrc-content-initiative]].

## Data Analytics and Geospatial Capabilities

The industry is increasingly leveraging advanced geospatial data analytics for risk assessment and scope definition. Key technologies include:
- **BigQuery and Earth Engine:** These platforms allow for enhanced geospatial analysis, enabling the processing of raster analytics and map visualization for large datasets.
- **Google Earth AI Models:** These models and datasets can map a smarter future by integrating diverse data sources into BigQuery.
- **Sustainability Data:** Geospatial datasets are being used to power BigQuery analysis, supporting sustainable practices and informing assessments like those related to agriculture and climate impact.
- **Mapping Tools:** Advanced APIs, such as the Solar API, are expanding coverage to track assets like rooftops worldwide, while tools like BigQuery DataFrames and CARTO facilitate cloud-based map building.

## How This Connects To The Empire

- **[[restore-assist]]** — exports both formats out of the [[floor-plan-workstream]] pipeline. Without that export, RA is a notepad. With it, RA is the contractor-side spine of the claim.
- **[[dr-nrpg]]** — positions contractors **against** the managed-repair stack. The [[voice-klark-brown]] voice is explicit: anti-TPA squeeze, pro-contractor margin. The platform is the alternative panel.
- **[[ccw]]** — equipment used by adjusters and contractors during inspection (moisture meters, thermal imagers). [[ccw]] is the supplier.
- **[[industry-association-vision-2026]]** — the association becomes the insurer-facing voice. Members get preferred-panel access via association certification rather than via TPA gate-keeping.

## Strategic Note

OnCORE (US) is the model. They are RIA-ranked #1 TPA for three years running. The AU version of that — built on [[dr-nrpg]] + [[restore-assist]] + [[carsi]] + the [[industry-association-vision-2026]] — is the structural opportunity. Loss adjusters and TPAs are not enemies; they are the channel.

## Cross-refs

[[restoration-industry-context]] · [[dr-nrpg]] · [[restore-assist]] · [[ccw]] · [[iicrc-content-initiative]] · [[industry-association-vision-2026]] · [[voice-klark-brown]] · [[floor-plan-workstream]] · [[data-analytics]] · [[geospatial-data]]