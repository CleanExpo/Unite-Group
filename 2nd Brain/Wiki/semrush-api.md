---
type: wiki
updated: 2026-05-08
---

# Semrush API — Professional Reference

## Authentication
All requests: `https://api.semrush.com/?type=ENDPOINT&key=API_KEY&domain=X&database=DB`
API Key: stored in `~/.hermes/.env` as `SEMRUSH_API_KEY` | 1Password: Unite-Group-Infrastructure vault
Units remaining: ~49,280 (checked 2026-05-08)

## Database Codes
- `au` — Australia (use for all ANZ portfolio businesses)
- `us` — USA (use for [[synthex]], Bulcs international)
- `uk` — United Kingdom
- `global` — worldwide aggregate

## Portfolio Business Registry
| Business | Domain | DB | Semrush Status |
|---|---|---|---|
| [[ccw]]-CRM | carpetcleanerswarehouse.com.au | au | Not indexed yet |
| RestoreAssist | restoreassist.app | au | Not indexed yet |
| DR Platform | disasterrecovery.com.au | au | ✅ 985 kws, ~276/mo |
| NRPG | nrpg.com.au | au | TBD |
| [[carsi]] | [[carsi]].com.au | au | ✅ 3 kws, ~23/mo |
| [[synthex]] | [[synthex]].social | us | Not indexed yet |
| Bulcs/MME | moisturemeterexperts.com.au | au | ✅ 20 kws |

## API Unit Costs (use consciously — 49K units available)
| Endpoint | Cost | Use for |
|---|---|---|
| `domain_rank` | 1 flat | Quick health check |
| `domain_organic` | 10/line | Keyword list |
| `domain_organic_organic` | 40/line | Competitor map |
| `domain_organic_pages` | 10/line | Top landing pages |
| `domain_domains` | 80/line | Domain comparison |
| `backlinks_overview` | 1 flat | Backlink summary |

**Monthly budget rule:** < 30,000 units. Single session cap: 5,000 units.

## Key Endpoints

### Domain Overview (1 unit)
`?type=domain_rank&key=KEY&domain=X&database=au`

### Organic Keywords (10/line)
`?type=domain_organic&key=KEY&domain=X&database=au&display_limit=50&display_sort=tr_desc&export_columns=Ph,Po,Nq,Tr,Cp,Ur`

### Competitors (40/line)  
`?type=domain_organic_organic&key=KEY&domain=X&database=au&display_limit=10&export_columns=Dn,Cr,Np,Or,Ot`

### Top Pages (10/line)
`?type=domain_organic_pages&key=KEY&domain=X&database=au&display_limit=20&export_columns=Ur,Tr,Kw`

### Domain vs Domain (80/line)
`?type=domain_domains&key=KEY&domains=%2A%7Cor%7CDOMAIN1%7C%2A%7Cor%7CDOMAIN2&database=au&display_limit=10&export_columns=Ph,P0,P1,Nq,Cp`

## Export Columns Reference
- Ph = Keyword, Po = Position, Nq = Search Volume, Tr = Traffic%, Cp = CPC
- Ur = URL, Kd = Keyword Difficulty, Co = Competition, Nr = # Results
- Dn = Domain, Cr = Competitor Relevance, Np = Common Keywords, Or = Organic Keywords, Ot = Organic Traffic

## Skill Location
`~/.claude/skills/semrush/SKILL.md` — invoke as `/semrush` in Claude Code

## Cross-refs
[[design-system-approach]] · [[mcp-ecosystem]] · [[operational-priorities-q2-2026]]
