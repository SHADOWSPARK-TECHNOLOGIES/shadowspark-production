# Production Runbook — ShadowSpark Control Plane

## 1. System Overview & Production Topology

| Component | Platform | Identity / URL | Monitoring / Access |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | Netlify | `https://shadowspark-production.netlify.app` | Site ID: `521ae4b1-39f7-4c5b-ac9c-db8f06d3a0d4` |
| **Backend AI API** | Render | `https://shadowspark-ai-api.onrender.com` | Service: `AI-ASSIST v1.1.0` |
| **Database** | Neon PostgreSQL | `ep-calm-glade-aglkkal-pooler.c-2.eu-central-1.aws.neon.tech` | Serverless pooled connection |
| **CI / Quality Gate** | GitHub Actions | `SHADOWSPARK-TECHNOLOGIES/shadowspark-production` | Workflows on `main` branch |
| **Deprecated** | Vercel | *Excluded from release gate / account blocked externally* | Do not route production traffic |

---

## 2. Health & Liveness Checks

### Web Frontend Liveness Probe
```bash
curl -I -s https://shadowspark-production.netlify.app/
# Expected: HTTP/2 200 OK (Content-Type: text/html)
```

### Upstream AI-ASSIST Backend Liveness Probe
```bash
curl -i -s https://shadowspark-ai-api.onrender.com/healthz
# Expected: HTTP/2 200 OK ({"status":"ok"})
```

### Application AI Health Endpoint
```bash
curl -i -s https://shadowspark-production.netlify.app/api/ai/health
# Expected: HTTP/2 200 OK ({"status":"active"|"thinking", ...})
```

### Compliance Adapter Fail-Closed Probe
```bash
curl -i -s https://shadowspark-production.netlify.app/api/compliance/reviews
# Expected: HTTP/2 401 Unauthorized ({"error":{"code":"UNAUTHORIZED", ...}})
```

---

## 3. Deployment & Cache Management

### Trigger Clear-Cache Production Redeploy
When configuration changes or manual redeployment is required:

```bash
npx netlify api createSiteBuild --data '{"site_id": "521ae4b1-39f7-4c5b-ac9c-db8f06d3a0d4", "clear_cache": true}'
```

### Check Latest Deployment Status
```bash
npx netlify api getDeploy --data '{"deploy_id": "<deploy_id>"}' | grep -E '"(state|error_message|commit_ref)"'
```

### Local Production Preview
To verify changes against production-identical build locally:
```bash
npm run build
npx next start -p 3000
```

---

## 4. Environment Variables Contract

| Key | Scope | Purpose | Rotation Frequency |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server-Only | Neon PostgreSQL connection string | On security incident |
| `AUTH_SECRET` | Server-Only | NextAuth session encryption (256-bit) | 90 days |
| `JWT_SECRET` | Server-Only | Fintech JWT token signing (256-bit) | 90 days |
| `NEXTAUTH_URL` | Server-Only | Canonical origin (`https://shadowspark-production.netlify.app`) | On domain change |
| `AI_ASSIST_API_URL` | Server-Only | Upstream Render service endpoint | On infrastructure move |
| `AI_ASSIST_API_TOKEN` | Server-Only | Service capability bearer token | 90 days |

To list configured keys on Netlify:
```bash
PAGER=cat npx netlify env:list --plain
```

---

## 5. Incident Response & Troubleshooting

### Scenario 1: Site returns 502 / Gateway Timeout on Compliance Routes
- **Symptom**: `/api/compliance/reviews` returns `504 GATEWAY_TIMEOUT` or `502`.
- **Cause**: Render free-tier instance was spun down due to inactivity (cold start delay ~30-45s).
- **Remedy**: Ping `https://shadowspark-ai-api.onrender.com/healthz` to wake the instance. For SLA-backed pilots, upgrade Render service to standard non-sleeping instance.

### Scenario 2: Unauthenticated Access Allowed to Dashboard
- **Symptom**: Navigating to `/dashboard` directly without logging in does not redirect.
- **Cause**: Edge middleware in `src/proxy.ts` bypassed or matcher misconfigured.
- **Remedy**: Inspect `src/proxy.ts` matcher array: must include `"/dashboard/:path*"`. Verify `HTTP 302` response to `/login`.

### Scenario 3: Database Connection Pool Exhaustion
- **Symptom**: API endpoints return 500 with Prisma connection timeout.
- **Cause**: Too many concurrent serverless lambdas holding connections.
- **Remedy**: Ensure `DATABASE_URL` uses the Neon pooled endpoint (`-pooler` hostname suffix with `?sslmode=require`).
