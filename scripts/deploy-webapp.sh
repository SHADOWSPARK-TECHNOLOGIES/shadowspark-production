#!/bin/bash
set -e

PROJECT_ID="shadowspark-production-489115"
REGION="europe-central2"
SERVICE_NAME="shadowspark-v1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "==========================================="
echo "🚀 DEPLOYING SHADOWSPARK TO CLOUD RUN"
echo "==========================================="

echo "[1/2] 🏗️ Building & Pushing Web Image via Cloud Build..."
gcloud builds submit --tag $IMAGE_NAME

echo "[2/2] 🚢 Deploying Web Service to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --no-cpu-throttling \
  --set-env-vars="VAULT_BUCKET=shadowspark-vault,AUTH_TRUST_HOST=true" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,FIRECRAWL_API_KEY=FIRECRAWL_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,PAYSTACK_SECRET_KEY=PAYSTACK_SECRET_KEY:latest,SLACK_WEBHOOK_URL=SLACK_WEBHOOK_URL:latest,REDIS_URL=REDIS_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,CRON_SECRET=CRON_SECRET:latest"

echo "✅ Web Service Deployed."
