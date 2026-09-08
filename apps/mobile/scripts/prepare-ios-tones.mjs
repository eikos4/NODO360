import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, '../../..');
const source = resolve(repository, 'apps/web/public/Audio');
const output = resolve(repository, 'apps/mobile/ios/App/App/Sounds');
mkdirSync(output, { recursive: true });

const tones = {
  '10_0.mp3': 'tone_10_0.caf',
  '10_1.mp3': 'tone_10_1.caf',
  '10_2.mp3': 'tone_10_2.caf',
  '10_3.mp3': 'tone_10_3.caf',
  '10_4.mp3': 'tone_10_4.caf',
  '10_5.mp3': 'tone_10_5.caf',
  '10_6.mp3': 'tone_10_6.caf',
  '10_7.mp3': 'tone_10_7.caf',
  '10_8.mp3': 'tone_10_8.caf',
  '10_9.mp3': 'tone_10_9.caf',
  'Alarma general 001.mp3': 'tone_10_10.caf',
  'Alarma de incendio 0001.mp3': 'tone_10_11.caf',
  'Llamado de comandancia 001.mp3': 'tone_10_12.caf',
};

const has = (command) =>
  spawnSync(command, ['-version'], { stdio: 'ignore' }).status === 0;
const converter = has('ffmpeg') ? 'ffmpeg' : has('afconvert') ? 'afconvert' : null;

if (!converter) {
  console.error(
    'Falta ffmpeg (Windows/macOS/Linux) o afconvert (incluido en macOS/Xcode). ' +
    'Instala uno y vuelve a ejecutar npm run prepare:ios-tones --workspace=apps/mobile.',
  );
  process.exit(1);
}

for (const [inputName, outputName] of Object.entries(tones)) {
  const input = resolve(source, inputName);
  const target = resolve(output, outputName);
  const args = converter === 'ffmpeg'
    ? ['-y', '-i', input, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', target]
    : ['-f', 'caff', '-d', 'LEI16@44100', '-c', '1', input, target];
  const result = spawnSync(converter, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Tonos CAF preparados en ${output}`);
