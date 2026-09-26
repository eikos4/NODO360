import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gms = path.join(root, 'android', 'app', 'google-services.json');

if (!existsSync(gms)) {
  console.error(`
Falta google-services.json real.

1. Abrí Firebase Console → proyecto Nodo360
2. App Android package: cl.nodo360.mobile
3. Descargá google-services.json
4. Guardalo en:
   ${gms}

Sin este archivo las alarmas NO llegan con la app cerrada.
`);
  process.exit(1);
}

try {
  const json = JSON.parse(readFileSync(gms, 'utf8'));
  const projectId = json?.project_info?.project_id ?? '';
  if (!projectId || projectId.includes('REPLACE') || !json?.client?.length) {
    console.error('google-services.json parece un placeholder. Usá el archivo real de Firebase Console.');
    process.exit(1);
  }
  console.log(`Firebase OK · project_id=${projectId}`);
} catch {
  console.error('google-services.json inválido (JSON roto).');
  process.exit(1);
}
