# CRM Integration Skills Registry

> Auto-generated: 2026-06-03
> Owner: Pi-DEV-OPS
> Status: Active

---

## Skill Inventory

| Skill Name | Category | Description | Use When |
|------------|----------|-------------|----------|
| `xero-integration` | devops | Xero Accounting API multi-tenant OAuth | Setting up Xero, debugging API errors |
| `google-crm-integration` | devops | Google OAuth + GSC + GA4 + Gmail + Drive | Activating Google services |
| `social-publishing` | devops | YT/FB/LI/Insta/TikTok publishing | Publishing content, adding channels |
| `oauth-credential-vault` | devops | Token encryption and rotation | Adding new OAuth services, rotating secrets |
| `crm-activation-orchestrator` | devops | Master coordinator for all integrations | Tracking project progress, status reports |

---

## Access

All skills live in the Hermes skill directory:
```
%LOCALAPPDATA%\hermes\skills\devops\
  ├── xero-integration\SKILL.md
  ├── google-crm-integration\SKILL.md
  ├── social-publishing\SKILL.md
  ├── oauth-credential-vault\SKILL.md
  └── crm-activation-orchestrator\SKILL.md
```

---

## How to Use

When working on any CRM integration, load the relevant skill first:

```
/skill xero-integration
/skill google-crm-integration
/skill social-publishing
/skill oauth-credential-vault
/skill crm-activation-orchestrator
```

Or reference by name in any task:
```
Delegate to Pi-DEV using skill: xero-integration
```

---

## Maintenance

| Skill | Last Updated | Owner |
|-------|-------------|-------|
| xero-integration | 2026-06-03 | Pi-DEV-OPS |
| google-crm-integration | 2026-06-03 | Pi-DEV-OPS |
| social-publishing | 2026-06-03 | Pi-DEV-OPS |
| oauth-credential-vault | 2026-06-03 | Pi-DEV-OPS |
| crm-activation-orchestrator | 2026-06-03 | Pi-DEV-OPS |

---

## Cross-References

- Gap Analysis: `docs/research/UNITE_HUB_CRM_INTEGRATION_GAP_ANALYSIS.md`
- Architecture: `docs/architecture/UNIFIED_AGENTIC_RESEARCH_TO_VIDEO_PIPELINE.md`
- Weekly Reviews: `src/app/api/cron/pi-ceo-weekly-review/route.ts`