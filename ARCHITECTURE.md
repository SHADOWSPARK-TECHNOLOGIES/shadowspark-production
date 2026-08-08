# Architecture

This is a frontend-only app. Business logic and authoritative data handling live in a separate backend service.

Frontend requests go to `/api/proxy/*`, and the Next.js server forwards them to `BACKEND_API_URL`.

`X-Tenant-Slug` is a routing hint only. The backend must derive the authoritative tenant from the JWT session.

All mutations send `Idempotency-Key` headers.

GET requests may auto-retry. Mutations do not.
