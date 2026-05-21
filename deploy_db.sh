#!/bin/bash
set -e
echo "[1/6] Enabling APIs..."
gcloud services enable sqladmin.googleapis.com compute.googleapis.com --quiet

echo "[2/6] Creating Instance (this may take a few minutes)..."
gcloud sql instances create shadowspark-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1 --quiet || echo "Instance may already exist."

echo "[3/6] Creating DB and User..."
gcloud sql databases create shadowspark --instance=shadowspark-db --quiet || true
gcloud sql users create shadowspark_user --instance=shadowspark-db --password="Shadowuser" --quiet || true

echo "[4/6] Patching IP..."
LOCAL_IP=$(curl -s ifconfig.me)
gcloud sql instances patch shadowspark-db --authorized-networks="${LOCAL_IP}/32" --quiet

echo "[5/6] Updating .env..."
DB_IP=$(gcloud sql instances describe shadowspark-db --format='value(ipAddresses[0].ipAddress)')
echo "DB IP is $DB_IP"
NEW_DB_URL="postgresql://shadowspark_user:Shadowuser@${DB_IP}:5432/shadowspark?sslmode=disable"
sed -i.bak -e "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_DB_URL}\"|" .env
sed -i.bak -e "s|^DIRECT_URL=.*|DIRECT_URL=\"${NEW_DB_URL}\"|" .env || true

echo "[6/6] Pushing Prisma..."
npx prisma db push

echo "Deployment finished!"
