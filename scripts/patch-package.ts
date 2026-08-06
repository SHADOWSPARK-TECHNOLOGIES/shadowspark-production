// path: scripts/patch-package.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const packagePath = join(process.cwd(), 'package.json');

function patchSovereignScripts() {
  console.log("🛠️  ARMING PACKAGE.JSON...");
  
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

  // Define the ShadowSpark Standard
  pkg.scripts = {
    ...pkg.scripts,
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "postinstall": "prisma generate"
  };

  // Enforce pnpm if not already set
  pkg.engines = {
    ...pkg.engines,
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  };

  writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  console.log("✅ SCRIPTS ALIGNED: Webpack-fallback and Prisma-auto-gen active.");
}

patchSovereignScripts();
