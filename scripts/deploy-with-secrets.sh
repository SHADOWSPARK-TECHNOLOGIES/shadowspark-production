#!/usr/bin/env bash
# ============================================================================
# deploy-with-secrets.sh
#
# Deploys ShadowSpark to Cloud Run with GCP Secret Manager integration.
# All sensitive env vars are injected via --set-secrets, NOT plaintext .env.
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Secrets already created in GCP Secret Manager
#   - Cloud Run service already exists (or --allow-unauthenticated for first deploy)
#
# Usage:
#   ./scripts/deploy-with-secrets.sh [service-name] [region]
#
# Defaults:
#   SERVICE=shadowspark-v1
#   REGION=europe-central2
#
# Secret naming convention (create these in Secret Manager first):
#   shadowspark-paystack-secret-key
#   shadowspark-meta-access-token
#   shadowspark-meta-phone-number-id
#   shadowspark-cron-secret
#   shadowspark-database-url
#   shadowspark-redis-url
#   shadowspark-slack-webhook-url
#   shadowspark-nextauth-secret
#   shadowspark-nextauth-url
#   shadowspark-resend-api-key
# ============================================================================

set -euo pipefail

SERVICE="${1:-shadowspark-v1}"
REGION="${2:-europe-central2}"
PROJECT="${GOOGLE_CLOUD_PROJECT:-shadowspark-production-489115}"

echo "=== Deploying ${SERVICE} to ${REGION} (project: ${PROJECT}) ==="
echo ""

# Build the container
echo "🔨 Building container..."
gcloud builds submit \
  --project="${PROJECT}" \
  --tag "gcr.io/${PROJECT}/${SERVICE}:latest"

# Deploy with Secret Manager references
echo ""
echo "🚀 Deploying to Cloud Run with Secret Manager..."
echo ""

gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --image="gcr.io/${PROJECT}/${SERVICE}:latest" \
  --allow-unauthenticated \
  --memory="1Gi" \
  --cpu="1" \
  --min-instances="0" \
  --max-instances="10" \
  --concurrency="80" \
  --timeout="300" \
  --set-secrets="DATABASE_URL=shadowspark-database-url:latest" \
  --set-secrets="REDIS_URL=shadowspark-redis-url:latest" \
  --set-secrets="PAYSTACK_SECRET_KEY=shadowspark-paystack-secret-key:latest" \
  --set-secrets="META_ACCESS_TOKEN=shadowspark-meta-access-token:latest" \
  --set-secrets="META_PHONE_NUMBER_ID=shadowspark-meta-phone-number-id:latest" \
  --set-secrets="CRON_SECRET=shadowspark-cron-secret:latest" \
  --set-secrets="SLACK_WEBHOOK_URL=shadowspark-slack-webhook-url:latest" \
  --set-secrets="NEXTAUTH_SECRET=shadowspark-nextauth-secret:latest" \
  --set-secrets="NEXTAUTH_URL=shadowspark-nextauth-url:latest" \
  --set-secrets="RESEND_API_KEY=shadowspark-resend-api-key:latest" \
  --set-secrets="FIRECRAWL_API_KEY=FIRECRAWL_API_KEY:latest" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-secrets="AUTH_SECRET=AUTH_SECRET:latest" \
  --set-env-vars="NEXT_PUBLIC_APP_URL=https://shadowspark-tech.org" \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXT_RUNTIME=nodejs" \
  --set-env-vars="AUTH_TRUST_HOST=true" \
  --set-env-vars="VAULT_BUCKET=shadowspark-vault"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To verify secrets are mounted correctly:"
echo "  gcloud run services describe ${SERVICE} --region=${REGION} --project=${PROJECT}"
echo ""
echo "To view logs:"
echo "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE}\" --limit=50 --project=${PROJECT}"
