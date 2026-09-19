import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const win = process.platform === 'win32';
const gradle = path.join(android, win ? 'gradlew.bat' : 'gradlew');

if (!existsSync(gradle)) {
  console.error('Falta android/gradlew. Corre primero: npx cap add android');
  process.exit(1);
}

const child = spawn(gradle, ['assembleDebug'], {
  cwd: android,
  stdio: 'inherit',
  shell: win,
});

child.on('exit', (code) => process.exit(code ?? 1));
