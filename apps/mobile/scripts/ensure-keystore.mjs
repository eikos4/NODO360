import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const appDir = path.join(android, 'app');
const propsPath = path.join(android, 'keystore.properties');
const storeFileName = 'nodo360-mobile-release.keystore';
const storePath = path.join(appDir, storeFileName);
const alias = 'nodo360-mobile';

function resolveKeytool() {
  if (process.env.KEYTOOL && existsSync(process.env.KEYTOOL)) return process.env.KEYTOOL;
  const home = process.env.JAVA_HOME;
  if (home) {
    const cand = path.join(home, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
    if (existsSync(cand)) return cand;
  }
  return process.platform === 'win32' ? 'keytool.exe' : 'keytool';
}

if (existsSync(propsPath) && existsSync(storePath)) {
  console.log('Keystore ya existe:');
  console.log(`  ${storePath}`);
  console.log(`  ${propsPath}`);
  process.exit(0);
}

const password = randomBytes(18).toString('base64url');
const dname = 'CN=Nodo360, OU=Bomberos, O=Kodesk, L=Parral, ST=Maule, C=CL';
const keytool = resolveKeytool();
const args = [
  '-genkeypair',
  '-v',
  '-storetype', 'PKCS12',
  '-keystore', storePath,
  '-alias', alias,
  '-keyalg', 'RSA',
  '-keysize', '2048',
  '-validity', '10000',
  '-storepass', password,
  '-keypass', password,
  '-dname', dname,
];

console.log(`Generando keystore release con: ${keytool}`);
const result = spawnSync(keytool, args, { stdio: 'inherit', shell: false });
if (result.error || result.status !== 0) {
  console.error('\nNo se pudo ejecutar keytool. Instalá JDK 17+ y definí JAVA_HOME, o KEYTOOL=ruta\\a\\keytool.exe');
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}

writeFileSync(
  propsPath,
  [
    `storeFile=${storeFileName}`,
    `storePassword=${password}`,
    `keyAlias=${alias}`,
    `keyPassword=${password}`,
    '',
  ].join('\n'),
  'utf8',
);

console.log('\nListo. Guardá una copia segura de:');
console.log(`  ${storePath}`);
console.log(`  ${propsPath}`);
console.log('Sin estos archivos no podrás actualizar la misma APK en los teléfonos (firma distinta = desinstalar).');
