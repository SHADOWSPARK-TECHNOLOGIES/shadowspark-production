# Security Operations — rPPG Liveness & Passkey Policy

## 1. rPPG Liveness Analysis — Operational Bounds

### Classification Tiers

| Verdict | Condition | Action | Estimated FPR |
|---------|-----------|--------|---------------|
| **Live** | HR 40–150 bpm, quality ≥ 0.15, no degradation flags | Allow | — |
| **Inconclusive** | Low quality + degradation, insufficient frames, borderline HR | Require additional verification (e.g., manual review, OTP) | ~2–5% under normal conditions |
| **Spoof** | HR < 30 or > 220 bpm, flat signal (no degradation), signal quality < 0.15 (no degradation) | Hard reject | ≤ 0.5% for genuine users |

### False Positive Rate (FPR) Estimates

- **Live → Inconclusive (degraded capture):** ~3–5% — user moves, poor lighting, camera obstruction. Mitigation: retry prompt ("Please stay still in good lighting").
- **Live → Spoof (false rejection):** ≤ 0.5% — occurs only for physiologically impossible HR readings or perfectly flat signals on genuine users. Mitigation: fallback to FIDO2 passkey or TOTP.
- **Inconclusive → Spoof (upward classification):** Not possible — inconclusive never escalates to spoof. It requires additional verification.

### Degraded-State Detection Thresholds

| Degradation | Detection Method | Threshold | Typical Causes |
|-------------|-----------------|-----------|----------------|
| Low Light | Mean pixel brightness across all channels | < 30 / 255 | Dim room, backlit subject |
| High Compression | Frame-to-frame variance | < 5 | Low-bitrate video, screen recording, synthetic generation |
| Motion Blur | Inter-frame green channel difference | > 50 | Rapid head movement, camera shake |
| Camera Denied | Canvas/video null on init | N/A | Permission denied, missing camera |

### Operator Guidelines

1. **Inconclusive responses are NOT security events** — they indicate the system cannot determine liveness. Treat as a request for re-capture or alternate verification.
2. **Spoof responses are security events** — log with user ID, timestamp, HR, quality score, and degraded flags. Escalate to fraud team if > 3 spoof events per user per 24h.
3. **High-quality deepfake detection** relies on subtle compression artifacts (frame variance < 5). If an attacker generates a perfect deepfake with no detectable artifacts and a plausible HR (40–150 bpm), the system returns "live" — this is a known limitation. The passkey requirement (FIDO2) is the primary phishing-resistant control; rPPG is a secondary fraud-risk signal.

---

## 2. Passkey Authentication — Policy & Fallback

### Passkey-First Enforcement

| Scenario | Behavior |
|----------|----------|
| User has ≥ 1 registered passkey | Passkey option presented first in toggle. Password still available as fallback. |
| User has 0 registered passkeys | Password-only auth (no passkey option shown until registration). |
| Passkey registration via `/api/auth/register-options` | Generates challenge, stores server-side with 60s expiry, ceremony-binding to "registration". |
| Passkey auth via `/api/auth/login-options` | Generates challenge, stores server-side with 60s expiry, ceremony-binding to "authentication". |

### Challenge Lifecycle

```
[Options] → Generate challenge → Store in web_authn_challenges (userId, challenge, type, expiresAt)
              ↓
[Client]   → navigator.credentials.create() or .get()
              ↓
[Verify]   → Look up challenge by value
           → Reject if missing (unknown challenge)
           → Reject if usedAt is not null (replay)
           → Reject if expiresAt < now (stale)
           → Reject if type doesn't match ceremony (cross-ceremony replay)
           → Mark usedAt = now
           → Verify origin, counter, clientData
           → Delete challenge record
           → Issue session
```

### Password Fallback Policy

- **Password fallback is always available** for users who enrolled with a password. This is intentional: a user who loses all passkeys (e.g., device wipe, iCloud Keychain loss) must not be locked out.
- **Passkey-enrolled users are identified** by the presence of rows in the `passkeys` table linked to their `userId`.
- **Future enhancement**: Add a "passkey-only" flag on the User model for organizations that require passkey-only auth.

### Bypass Marker (`passkey-auth-bypass`)

The special password value `"passkey-auth-bypass"` is used by the `verify-login` route to signal to NextAuth that WebAuthn verification has already completed successfully.

**Security invariants enforced in `auth.ts` authorization handler:**
1. The user MUST exist in the database.
2. The user MUST have at least one registered passkey (`user.passkeys.length > 0`).
3. The bypass does NOT circumvent WebAuthn — it is only called after `verify-login` validates the assertion.

**This prevents:**
- An attacker who knows the bypass marker from creating a session for any arbitrary user.
- Session creation for users who have never completed passkey registration.

---

## 3. Incident Response

### rPPG Spoof Alert

```
Event: rPPG spoof verdict
Log:  { userId, timestamp, heartRate, quality, degradedFlags, sessionId }
Action:
  1. If user has active passkey → allow retry with passkey-only
  2. If no passkey → flag for manual review, notify fraud team
  3. Increment spoof counter for user; if > 3 in 24h → temporary lockout
```

### Passkey Challenge Replay Detected

```
Event: Challenge replay rejection (usedAt not null or challenge not found)
Log:  { userId?, challenge, timestamp, ipAddress }
Action:
  1. This is EXPECTED for normal retries — only escalate if:
     - Same challenge submitted from different IP/user agent within same second
     - > 10 replay rejections for same userId in 5 minutes
  2. If escalated → notify security team, invalidate all pending challenges for user
```

### Counter Replay Detected

```
Event: passkey counter did not increase
Log:  { userId, credentialId, storedCounter, submittedCounter, timestamp }
Action:
  1. This indicates the authenticator may be cloned or restored from backup
  2. Immediately invalidate the compromised credential
  3. Require re-registration of all passkeys for the affected user
  4. Notify security team for forensic analysis
```

---

## 4. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| rPPG returns "live" for perfect deepfake with plausible HR | False negative | Passkey (FIDO2) is primary auth; rPPG is secondary signal |
| Cross-platform authenticators (YubiKey) rejected in register-options | Platform-only restriction | Intentional — simplifies attestation; future: add cross-platform support |
| Challenge stored in plaintext (base64url) | No confidentiality | Challenges are single-use, short-lived (60s), and random 32 bytes |
| No rate limiting on options endpoints | DoS on challenge table | Future: add per-user rate limiting on options routes |
