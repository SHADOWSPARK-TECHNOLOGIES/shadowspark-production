#!/bin/bash
set -e

echo "[SHADOWSPARK] 1. Enabling Google Cloud APIs..."
gcloud services enable sqladmin.googleapis.com compute.googleapis.com --quiet

echo "[SHADOWSPARK] 2. Provisioning Cloud SQL Instance (db-f1-micro)..."
# Provisioning takes ~3-5 minutes
gcloud sql instances create shadowspark-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --quiet || echo "Instance already exists, continuing..."

echo "[SHADOWSPARK] 3. Creating Database and User..."
gcloud sql databases create shadowspark --instance=shadowspark-db --quiet || true
gcloud sql users create shadowspark_user \
  --instance=shadowspark-db \
  --password="SHADOW_SPARK_SECURE_2026_!" --quiet || true

echo "[SHADOWSPARK] 4. Authorizing Local IP for Direct Connection..."
LOCAL_IP=$(curl -s ifconfig.me)
gcloud sql instances patch shadowspark-db \
  --authorized-networks="${LOCAL_IP}/32" --quiet

echo "[SHADOWSPARK] 5. Wiring Database Credentials..."
DB_IP=$(gcloud sql instances describe shadowspark-db --format='value(ipAddresses[0].ipAddress)')
echo "Retrieved Cloud SQL IP: $DB_IP"

NEW_URL="postgresql://shadowspark_user:SHADOW_SPARK_SECURE_2026_!@${DB_IP}:5432/shadowspark?sslmode=disable"

# Safely inject into .env
sed -i.bak -e "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" .env
sed -i.bak -e "s|^DIRECT_URL=.*|DIRECT_URL=\"${NEW_URL}\"|" .env

echo "[SHADOWSPARK] 6. Pushing Schema (Activating Intent Scoring & Sniper Models)..."
npx prisma db push --accept-data-loss

echo "[SHADOWSPARK] DEPLOYMENT COMPLETE. The Sovereign Engine is now live on Google Cloud."
