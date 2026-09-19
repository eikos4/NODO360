import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'nodotrack-icon-1024.png');
const androidRes = join(root, 'android', 'app', 'src', 'main', 'res');
const webPublic = join(root, '..', 'web', 'public', 'nodotrack-icon.png');

const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

for (const [folder, size] of Object.entries(launcherSizes)) {
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  const png = await sharp(src).resize(size, size).png().toBuffer();
  await sharp(png).toFile(join(dir, 'ic_launcher.png'));
  await sharp(png).toFile(join(dir, 'ic_launcher_round.png'));
}

for (const [folder, size] of Object.entries(foregroundSizes)) {
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  const inset = Math.round(size * 0.12);
  const inner = size - inset * 2;
  await sharp(src)
    .resize(inner, inner)
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: { r: 8, g: 42, b: 32, alpha: 1 },
    })
    .png()
    .toFile(join(dir, 'ic_launcher_foreground.png'));
}

mkdirSync(join(androidRes, 'drawable'), { recursive: true });
await sharp(src).resize(288, 288).png().toFile(join(androidRes, 'drawable', 'ic_splash_mark.png'));
await sharp(src).resize(192, 192).png().toFile(webPublic);
await sharp(src).resize(512, 512).png().toFile(join(root, 'assets', 'nodotrack-play-512.png'));

console.log('NodoTrack launcher icons generated.');
