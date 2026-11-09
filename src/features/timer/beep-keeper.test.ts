// Трек-держатель медиа-канала: iOS гасит тракт на тишине и будит его ~0,7 с.
// ±1/32767 (почти цифровой ноль) iOS считает тишиной — держателем годится
// только настоящий тихий шум. Тест читает сам wav и держит этот порог.

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function pcmSamples(): Int16Array {
  const buf = readFileSync(resolve(__dirname, 'beep-keeper.wav'));
  expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
  expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      return new Int16Array(
        buf.buffer.slice(buf.byteOffset + off + 8, buf.byteOffset + off + 8 + size),
      );
    }
    off += 8 + size + (size % 2);
  }
  throw new Error('в wav нет data-чанка');
}

test('держатель — настоящий шум: RMS ≥ 16 и пик ≥ 32 (не цифровой ноль)', () => {
  const s = pcmSamples();
  expect(s.length).toBeGreaterThan(20000); // ~1 с на 22050 Гц
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < s.length; i++) {
    const v = s[i]!;
    peak = Math.max(peak, Math.abs(v));
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / s.length);
  // пик ≥ 32 (≈ −60 дБ) — тише iOS тракт не считает звуком;
  // RMS ≥ 16 — это шум целиком, а не редкие щелчки в тишине
  expect(peak).toBeGreaterThanOrEqual(32);
  expect(rms).toBeGreaterThanOrEqual(16);
});
