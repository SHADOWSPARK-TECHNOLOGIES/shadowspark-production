#!/usr/bin/env npx ts-node
/**
 * GCP Health Check Script
 * Run: npx ts-node scripts/gcp-health-check.ts
 * Checks: billing status, Cloud SQL, Cloud Run, Secret Manager
 */

import { execSync } from 'child_process';

const PROJECTS = [
  { name: 'ShadowSpark', id: process.env.SHADOWSPARK_PROJECT_ID || 'shadowspark-production' },
  { name: 'Lodgist', id: process.env.LODGIST_PROJECT_ID || 'lodgist-production' },
];

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'ERROR';
  }
}

async function checkProject(project: { name: string; id: string }) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${project.name} (${project.id})`);
  console.log('═'.repeat(50));

  // Billing
  const billing = run(
    `gcloud billing projects describe ${project.id} --format="value(billingEnabled)"`
  );
  console.log(`  Billing Active:  ${billing === 'True' ? '✅ YES' : '🔴 NO — SUSPENDED'}`);

  // Cloud SQL
  const sql = run(
    `gcloud sql instances list --project=${project.id} --format="value(name,state)" 2>/dev/null`
  );
  console.log(`  Cloud SQL:       ${sql || 'None found'}`);

  // Cloud Run
  const run_services = run(
    `gcloud run services list --project=${project.id} --platform=managed --format="value(metadata.name,status.conditions[0].status)" 2>/dev/null`
  );
  console.log(`  Cloud Run:       ${run_services || 'None found'}`);

  // Secrets
  const secrets = run(
    `gcloud secrets list --project=${project.id} --format="value(name)" 2>/dev/null | wc -l`
  );
  console.log(`  Secrets stored:  ${secrets.trim()} secrets in Secret Manager`);
}

async function main() {
  console.log('\n🔍 SHADOWSPARK / LODGIST — GCP HEALTH CHECK');
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);

  for (const project of PROJECTS) {
    await checkProject(project);
  }

  console.log('\n✅ Health check complete\n');
}

main().catch(console.error);
