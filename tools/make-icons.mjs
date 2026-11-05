// Генерация иконок PWA: круг-мишень на прозрачном фоне (Task 12, Step 1).
// Запуск: node tools/make-icons.mjs — пишет PNG в public/icons/ и favicon.svg.
// Файлы коммитятся; скрипт остаётся для регенерации при смене дизайна.

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const BG = '#f5f2ec';
const ACCENT = '#e04e2f';

// Концентрические кольца мишени, viewBox 512
const targetSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <circle cx="256" cy="256" r="252" fill="${BG}"/>
  <circle cx="256" cy="256" r="188" fill="${ACCENT}"/>
  <circle cx="256" cy="256" r="124" fill="${BG}"/>
  <circle cx="256" cy="256" r="60" fill="${ACCENT}"/>
</svg>`;

const icons = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

await mkdir('public/icons', { recursive: true });

for (const { file, size } of icons) {
  await sharp(Buffer.from(targetSvg(size))).png().toFile(`public/icons/${file}`);
  console.log(`public/icons/${file} (${size}x${size})`);
}

await writeFile('public/favicon.svg', targetSvg(32), 'utf8');
console.log('public/favicon.svg');
