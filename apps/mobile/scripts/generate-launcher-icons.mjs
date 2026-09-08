import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'assets', 'launcher-icon.svg'));
const androidRes = join(root, 'android', 'app', 'src', 'main', 'res');
const iosIcon = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');

const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, size] of Object.entries(launcherSizes)) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), png);
}

mkdirSync(dirname(iosIcon), { recursive: true });
await sharp(svg).resize(1024, 1024).png().toFile(iosIcon);

console.log('Launcher icons generated for Android and iOS.');
