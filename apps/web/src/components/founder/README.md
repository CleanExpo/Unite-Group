# Founder CRM UI (`components/founder`)

Private founder surface. Routes live under `src/app/(founder)/founder/`; server logic lives in `src/lib/`; this tree is **presentation and client orchestration only**.

## Domain folders (one feature per directory)

Each subdirectory is a product domain. Keep new work inside the matching folder — do not add parallel roots.

| Folder | Route(s) | Typical `lib/` partners |
|--------|----------|-------------------------|
| `contacts/` | `/founder/contacts` | `lib/crm`, Supabase contacts tables |
| `email/`, `inbox/` | `/founder/email`, `/founder/inbox` | `lib/integrations`, `lib/email` |
| `kanban/` | `/founder/kanban` | `lib/integrations/linear`, issues |
| `campaigns/` | `/founder/campaigns` | `lib/campaigns` |
| `bookkeeper/` | `/founder/bookkeeper` | `lib/bookkeeper`, Xero |
| `vault/` | `/founder/vault` | `lib/vault` |
| `dashboard/` | home widgets | `lib/metering`, coaches |
| `experiments/` | `/founder/experiments` | `lib/experiments` |
| `advisory/` | `/founder/advisory` | `lib/advisory` |
| `strategy/` | `/founder/strategy` | strategy insights APIs |
| `social/` | `/founder/social` | `lib/integrations/social` |
| `settings/` | `/founder/settings` | `lib/email-accounts`, integrations |
| `command-centre/` | portfolio / mission UI | `lib/command-centre` |

Command deck shell pieces also live under `src/components/command-centre/` — import those for board/mission chrome, not duplicate layouts here.

## Thin route pattern

```tsx
// app/(founder)/founder/contacts/page.tsx
import { ContactsPageClient } from '@/founder/contacts/ContactsPageClient'

export default function ContactsPage() {
  return <ContactsPageClient />
}
```

- **`page.tsx`**: metadata, auth gates, data loaders (server components) — minimal JSX.
- **`*PageClient.tsx`**: interactive UI; may call route handlers or server actions.
- **`lib/`**: fetching, validation, RLS-scoped queries (`founder_id`), no React.

## Import convention

```ts
import { ContactFormModal } from '@/founder/contacts/ContactFormModal'
```

Use `@/founder/*` for founder UI. Use `@/lib/*` for shared server modules. Do not import founder UI from public marketing routes.

## Tests

Colocate under `components/founder/<domain>/__tests__/` or beside `app/(founder)/.../__tests__/` when the assertion is route-specific.
