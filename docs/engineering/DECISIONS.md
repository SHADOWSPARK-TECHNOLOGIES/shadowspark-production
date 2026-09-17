# Engineering decisions

## 2026-09-16: Passkey containment

RULING: Remove the credentials static-marker bypass and return 503 from the incomplete passkey assertion endpoint. Password and OAuth mechanisms are retained.

EVIDENCE: Real provider callback accepted the marker for accounts with passkeys, including accounts without password hashes. A fabricated assertion without signature returned HTTP 200 and attempted session creation. Both regressions were demonstrated before edits.

RISK IF WRONG: Passkey-only users cannot sign in until a secure flow is implemented. This is deliberate containment of an authentication bypass; existing credential data is preserved.

Installed next-auth is 5.0.0-beta.31. No new library API is introduced. WebAuthn authentication requires signature verification using the registered key: [W3C assertion verification](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion). Client JSON, a credential ID and a counter are insufficient proof.

## 2026-09-16: Preserve independent work and runtime

RULING: Leave pre-existing untracked adapter/compliance files untouched and uncommitted. Use installed Node 24 for validation without changing the machine default or package dependencies.

EVIDENCE: Recovery Git status and `.nvmrc`/package engines. Current backend contract has not been verified.

RISK IF WRONG: Adapter tests remain provisional and must not be treated as proof of upstream compatibility.

## 2026-09-17: Production Release Platform Target (Netlify + Render + Neon)

RULING: Direct the production web frontend deployment path to Netlify. Deprecate Vercel as an active deployment path and release gate.

TARGET TOPOLOGY:
- Frontend: Netlify (OpenNext Next.js Runtime, preview deploy verified on PR #106)
- Backend: Render / AI-ASSIST v1.1.0 upstream
- Database: Neon PostgreSQL
- CI: GitHub Actions (Code Coverage, Typecheck, Credential leak guard, CodeQL)

VERCEL STATUS:
DEPRECATED / EXTERNAL ACCOUNT BLOCKED / NOT RELEASE GATE. The Vercel account hold is an external administrative blocker that does not block application deployment to the approved Netlify target.
