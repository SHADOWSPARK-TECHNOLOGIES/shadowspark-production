import fs from 'fs';
import path from 'path';

try {
  console.log('Attempting to fix broken Prisma migration...');
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Nothing to do.');
    process.exit(0);
  }

  const migrationDirs = fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  if (migrationDirs.length === 0) {
    console.log('No migration folders found. Nothing to delete.');
    process.exit(0);
  }

  const latestMigration = migrationDirs[migrationDirs.length - 1];
  const dirToDelete = path.join(migrationsDir, latestMigration);

  console.log(`[FIX] Identified latest migration to delete: ${latestMigration}`);
  
  fs.rmSync(dirToDelete, { recursive: true, force: true });
  
  console.log(`[FIX] Successfully deleted directory: ${dirToDelete}`);
  console.log('✅ Prisma migration directory cleaned.');

} catch (error) {
  console.error('❌ Error during migration fix:', error);
  process.exit(1);
}
