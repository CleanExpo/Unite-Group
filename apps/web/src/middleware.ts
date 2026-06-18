// Next.js middleware entry point — must be at src/middleware.ts.
// The implementation lives in proxy.ts (rate-limit + session refresh + auth guard + CSP).
export { proxy as default, config } from './proxy';
