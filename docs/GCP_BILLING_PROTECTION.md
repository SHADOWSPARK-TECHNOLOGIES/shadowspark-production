# GCP Billing Protection SOP

## Budget Alerts (Set These Now)
1. Go to: console.cloud.google.com → Billing → Budgets & Alerts
2. Create budget: $50/month hard limit
3. Alerts at: 50%, 80%, 100%, 110%
4. Notification channels: email + Pub/Sub webhook

## If Billing Suspension Occurs
1. Go to Billing → Manage → Reactivate Account
2. Add backup payment method (keep 2 on file)
3. After restoration: `gcloud compute instances list --project=PROJECT_ID`
4. Restart any stopped instances: `gcloud compute instances start NAME --zone=ZONE`
5. Verify Cloud SQL: `gcloud sql instances list`
6. Restart Cloud SQL if needed: `gcloud sql instances patch NAME --activation-policy=ALWAYS`
7. Verify Prisma connection: `npx prisma db pull`

## Root Cause Prevention
- Never commit service account key files to git
- Store all secrets in GCP Secret Manager
- Use Workload Identity Federation instead of SA keys where possible
- Set max quota limits on all GCP APIs
