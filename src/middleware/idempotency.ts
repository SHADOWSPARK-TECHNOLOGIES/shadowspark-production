/**
 * Compatibility export for routes that still import the historical middleware
 * path. The implementation lives in one place so every mutation receives the
 * same tenant scoping, key validation, cache TTL, and replay headers.
 */
export { withIdempotency } from "@/lib/idempotency";
