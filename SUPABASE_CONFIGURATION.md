# Supabase Configuration for Unite Group

## Project URL
```
https://uqfgdezadpkiadugufbs.supabase.co
```

## Environment Variables Required

Update your `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL="https://uqfgdezadpkiadugufbs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[Your anon key from Supabase dashboard]"
SUPABASE_SERVICE_ROLE_KEY="[Your service role key from Supabase dashboard]"
```

## Getting Your Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy:
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Database Connection String

For direct database connections:
```
DATABASE_URL="[Your connection string from Supabase dashboard]"
```

Find this in Settings > Database > Connection string

## Important Security Notes

- Never commit `.env.local` to git
- The `service_role` key should never be exposed to the client
- Only use `anon` key in client-side code
- Keep all keys secure and rotate them periodically
