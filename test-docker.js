import { execSync } from 'child_process';
try {
  const output = execSync('docker ps', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
