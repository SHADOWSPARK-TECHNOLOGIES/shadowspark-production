PROJECT
shadowspark-production

OBJECTIVE
Maintain recoverable, evidence-first progress toward production readiness while preserving uncommitted adapter work and keeping unverified AI-ASSIST integration disabled.

BRANCH
feat/ai-assist-adapter

HEAD
4174a47fb04e16314435b0145c9464202cc54cdd

DIRTY/CLEAN
DIRTY. Two tracked auth files are modified; adapter, compliance, test, and engineering files are untracked.

COMPLETED WORK
Recovered state and documented the checkpoint. Removed the static passkey-auth-bypass credentials branch. Replaced the incomplete unsigned passkey login route with a fail-closed 503 response. Added tests covering real credentials authorization and the route boundary.

LOCAL COMMITS
None after HEAD 4174a47.

TESTS ACTUALLY RUN
Focused auth tests: 5 passed. Full bounded Vitest run: 190 passed. Production build: passed. Credential leak guard: 9 passed. Full lint: 825 errors and 866 warnings. Typecheck had observed failures; no green result is recorded.

CURRENT BLOCKERS
Passkey enrollment remains unsafe and passkey login is disabled pending a secure implementation. Typecheck and lint require follow-up verification/fixes. No verified AI-ASSIST contract is recorded in this checkpoint.

AI-ASSIST DEPENDENCIES
Keep src/lib/ai-assist and src/app/api/compliance untracked and inactive until upstream contract evidence is independently verified. Required evidence includes auth, tenant isolation, schemas, queue/decision state, idempotency, errors, and compatibility tests.

FILES CURRENTLY UNTRACKED/MODIFIED
Modified: src/auth.ts; src/app/api/auth/verify-login/route.ts.
Untracked: docs/engineering/; src/app/api/compliance/; src/lib/ai-assist/; tests/ai-assist-client.test.ts; tests/api/compliance.test.ts; tests/auth-credentials.test.ts; tests/passkey-login.test.ts.

NEXT EXACT UNBLOCKED ACTION
Sequentially rerun npm run typecheck under Node 24 after the test typing corrections, then review the auth diff and focused tests.

DO NOT DO
Do not reset or clean Git state, push, deploy, merge, enable passkeys, activate AI-ASSIST, or invent external contracts.

