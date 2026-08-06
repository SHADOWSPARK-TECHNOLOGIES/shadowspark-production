    1 // ~/shadowspark-v1-work/vercel.json
    2 {
    3   "version": 2,
    4   "buildCommand": "pnpm run build",
    5   "installCommand": "pnpm install",
    6   "ignoreCommand": "bash -c 'if [ \"$VERCEL_ENV\" = \"production\" ]; then exit 1; else exit 0; fi'",
    7   "regions": ["cpt1"], 
    8   "env": {
    9     "NODE_ENV": "production"
   10   }
   11 }

    1 // ~/shadowspark-v1-work/scripts/deploy-staging.sh
    2 #!/bin/bash
    3 # --- SHADOWSPARK STAGING DEPLOYMENT ---
    4 # Target: Lagos Demo Market
    5 # --------------------------------------
    6
    7 set -e
    8
    9 GOLD='\033[0;33m'
   10 CYAN='\033[0;36m'
   11 NC='\033[0m'
   12
   13 echo -e "${CYAN}[DEPLOYMENT]: Initiating Lagos Staging Sequence...${NC}"
   14
   15 # 1. Verification
   16 if ! command -v vercel &> /dev/null; then
   17     echo -e "${GOLD}[WARNING]: Vercel CLI not found. Installing globally...${NC}"
   18     npm i -g vercel
   19 fi
   20
   21 # 2. Link & Pull Environment
   22 echo -e "${CYAN}[DEPLOYMENT]: Linking to Vercel Project...${NC}"
   23 vercel link --yes
   24
   25 echo -e "${CYAN}[DEPLOYMENT]: Pulling remote environment variables...${NC}"
   26 vercel env pull .env.staging
   27
   28 # 3. Staging Push
   29 echo -e "${CYAN}[DEPLOYMENT]: Pushing local state to Staging Infrastructure...${NC}"
   30 STAGING_URL=$(vercel --confirm)
   31
   32 echo -e "\n========================================================"
   33 echo -e "✅ STAGING DEPLOYMENT COMPLETE"
   34 echo -e "========================================================"
   35 echo -e "🌐 LIVE DEMO URL: ${GOLD}${STAGING_URL}${NC}"
   36 echo -e "========================================================"
   37 echo -e "⚠️  CRITICAL OPERATIONAL NOTE:"
   38 echo -e "Vercel hosts the web tier. Your background workers MUST remain"
   39 echo -e "active on your dedicated server to process hybrid search intelligence."
   40 echo -e "Run: npx tsx src/lib/workers/lead-enrichment.worker.ts"
   41 echo -e "========================================================\n"

