# Customer & Tenant Onboarding Runbook

- **Document ID**: RB-OPS-002
- **Audience**: Platform Operations, Systems Engineers
- **Scope**: Step-by-step onboarding of new B2B institutional tenants into ShadowSpark
- **Last Updated**: 2026-09-18

---

## 1. Onboarding Workflow Overview
```
Customer Lead / Agreement Signed
  ↓
Phase 1: Due Diligence & Metadata Intake
  ↓
Phase 2: Database Tenant & User Provisioning
  ↓
Phase 3: API Key & Channel Configuration
  ↓
Phase 4: Smoke Test & Handshake Verification
  ↓
Phase 5: Secure Credential Handover
```

---

## 2. Phase 1: Due Diligence & Metadata Intake
Collect the following institutional data before provisioning:
1. **Company Legal Name** (per CAC Certificate of Incorporation).
2. **CAC Registration Number** (RC / BN number).
3. **Primary Admin Email & Full Name**.
4. **Primary Admin Phone Number** (WhatsApp enabled for notifications).
5. **Billing Contact & Tax Identification Number (TIN)**.
6. **Desired Tenant Identifier / Slug** (lowercase alphanumeric, e.g., `zenith-cap`, `kuda-credit`).

---

## 3. Phase 2: Database Tenant & Admin Provisioning

Tenant provisioning must strictly enforce multi-tenant isolation. Execute provisioning using the authoritative `auth-service` module or the operator CLI script.

### Method A: Via Operator Command Line / Script
Run the automated onboarding script from the repository root:
```bash
npx tsx scripts/provision-tenant.ts \
  --company="Acme Financial Services Ltd" \
  --slug="acme-fin" \
  --admin-name="Chidi Okafor" \
  --admin-email="c.okafor@acmefin.ng" \
  --role="ADMIN"
```

### Method B: Programmatic Verification (`src/lib/api/v1/auth-service.ts`)
Ensure the following database operations occur in an atomic transaction:
```ts
const { user, tenant, token } = await registerUser({
  email: "c.okafor@acmefin.ng",
  password: temporarySecurePassword,
  name: "Chidi Okafor",
  companyName: "Acme Financial Services Ltd",
});
// Automatically provisions:
// 1. User record (role: "ADMIN")
// 2. Tenant record (name & companyName)
// 3. TenantMembership record (role: "ADMIN", tenantId: tenant.id, userId: user.id)
```

---

## 4. Phase 3: Integration & Channel Configuration

### 4.1 Generate API Key
1. Generate a tenant-scoped API key:
   ```bash
   npx tsx scripts/generate-tenant-key.ts --tenant-id="[TENANT_ID]"
   ```
2. Key format: `sk_live_shsp_[32-byte-hex]`. Store only the SHA-256 hash in `prisma.apiKey`.

### 4.2 Configure WhatsApp Ingress (If Subscribed)
1. Add customer's phone number to Meta Business API mapping.
2. Verify webhook HMAC signature configuration:
   - Secret: `WHATSAPP_APP_SECRET`.
   - Endpoint: `https://shadowspark.ng/api/webhooks/whatsapp/meta`.
3. Send handshake ping:
   ```bash
   curl -X POST https://shadowspark.ng/api/webhooks/whatsapp/meta \
     -H "Content-Type: application/json" \
     -H "X-Hub-Signature-256: sha256=[VALID_HMAC]" \
     -d '{"object":"whatsapp_business_account","entry":[]}'
   ```

### 4.3 Configure AI-ASSIST Exception Review
1. Confirm tenant ID is recognized by the AI-ASSIST adapter:
   - Verify `src/lib/ai-assist/server-auth.ts` resolves the tenant ID from server-side session.
   - Confirm review queue queries at `/api/compliance/reviews` return an empty list (`[]`) rather than 401/403.

---

## 5. Phase 4: Smoke Test & System Health Verification
Execute the following verification checklist before notifying the customer:
- [ ] **Admin Login Verification**: Test admin login at `/login` using the provisioned credentials.
- [ ] **Tenant Isolation Check**: Verify that queries for loan applications or review queues do not leak cross-tenant records.
- [ ] **Double-Entry Ledger Invariant**: Verify ledger balance is initialized with zero balance:
  ```sql
  SELECT SUM(debit) - SUM(credit) AS delta FROM "ledger_entries" WHERE "tenantId" = '[TENANT_ID]';
  -- Result must be exactly 0.0000
  ```
- [ ] **Audit Trail Ping**: Confirm a `TENANT_INITIALIZED` event was written to `AuditLog`.

---

## 6. Phase 5: Secure Credential Handover
1. Dispatch welcoming email to customer admin:
   - Login URL: `https://shadowspark.ng/login`.
   - Temporary admin credentials (must force password reset / passkey registration upon first sign-in).
   - Documentation link: `https://shadowspark.ng/docs`.
   - Direct line to assigned Customer Success Engineer.
2. Schedule a 30-minute Orientation Walkthrough within 48 hours.
