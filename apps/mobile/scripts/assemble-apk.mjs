import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const win = process.platform === 'win32';
const gradle = path.join(android, win ? 'gradlew.bat' : 'gradlew');
const mode = process.argv[2] === 'release' ? 'release' : 'debug';
const task = mode === 'release' ? 'assembleRelease' : 'assembleDebug';

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', script), ...args], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exit ${code}`))));
  });
}

function bumpVersionNameWithDate() {
  const gradlePath = path.join(android, 'app', 'build.gradle');
  const raw = readFileSync(gradlePath, 'utf8');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let next = raw.replace(
    /versionName\s+"([^"-]+)(?:-[0-9]+)?"/,
    (_m, base) => `versionName "${base}-${stamp}"`,
  );
  next = next.replace(/versionCode\s+(\d+)/, (_m, n) => `versionCode ${Number(n) + 1}`);
  if (next !== raw) {
    writeFileSync(gradlePath, next, 'utf8');
    const name = next.match(/versionName\s+"([^"]+)"/)?.[1];
    const code = next.match(/versionCode\s+(\d+)/)?.[1];
    console.log(`versionName → ${name ?? '?'} · versionCode → ${code ?? '?'}`);
  }
}

if (!existsSync(gradle)) {
  console.error('Falta android/gradlew. Corre: npm run sync --workspace=apps/mobile');
  process.exit(1);
}

await runNode('check-firebase.mjs');
if (mode === 'release') {
  await runNode('ensure-keystore.mjs');
  bumpVersionNameWithDate();
}

const child = spawn(gradle, [task], {
  cwd: android,
  stdio: 'inherit',
  shell: win,
  env: process.env,
});

child.on('exit', (code) => {
  if (code === 0) {
    const out =
      mode === 'release'
        ? path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
        : path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const named = path.join(path.dirname(out), 'Nodo360.apk');
    copyFileSync(out, named);
    const desktop = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'Nodo360.apk');
    try {
      copyFileSync(out, desktop);
      console.log(`\nAPK lista:\n  ${named}\n  ${desktop}`);
    } catch {
      console.log(`\nAPK lista:\n  ${named}`);
    }
  }
  process.exit(code ?? 1);
});
