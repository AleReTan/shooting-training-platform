import { test, expect, beforeEach, afterEach } from 'vitest';
import { beep, unlockAudio, keepAudioAwake, releaseAudioAwake } from './beep';

// jsdom не умеет играть медиа — подменяем play/pause на учёт вызовов.
const played: HTMLAudioElement[] = [];
const pausedEls: HTMLAudioElement[] = [];

beforeEach(() => {
  played.length = 0;
  pausedEls.length = 0;
  HTMLMediaElement.prototype.play = function (this: HTMLAudioElement) {
    played.push(this);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function (this: HTMLAudioElement) {
    pausedEls.push(this);
  };
});

afterEach(() => {
  document.querySelectorAll('audio').forEach((a) => a.remove());
});

test('сигнал играет через audio-элемент — медиа-канал, а не Web Audio', () => {
  beep('start');
  expect(played.length).toBe(1);
});

test('три сигнала — три разных файла', () => {
  beep('start');
  beep('par');
  beep('stop');
  const srcs = new Set(played.map((a) => a.getAttribute('src')));
  expect(srcs.size).toBe(3);
});

test('unlockAudio по жесту готовит все три сигнала (play + сброс)', () => {
  unlockAudio();
  expect(played.length).toBe(3);
});

test('элементы живут в документе — кэш не плодит новые audio', () => {
  beep('start');
  beep('par');
  expect(document.querySelectorAll('audio').length).toBe(3);
});

test('unlock и сигнал играют одни и те же элементы (разблокировка не выбрасывается)', () => {
  unlockAudio();
  const unlocked = [...played];
  beep('start');
  expect(played[3]).toBe(unlocked[0]);
});

test('держатель: закольцованный тихий шум заводится и останавливается', () => {
  keepAudioAwake();
  const keeper = played[0]!;
  expect(keeper).toBeTruthy();
  expect(keeper.loop).toBe(true);
  expect(keeper.src).toContain('keeper'); // уровень шума в файле — beep-keeper.test.ts
  releaseAudioAwake();
  expect(pausedEls).toContain(keeper);
});

test('держатель один и переиспользуется, а не плодится', () => {
  keepAudioAwake();
  keepAudioAwake();
  const keepers = [...document.querySelectorAll('audio')].filter((a) =>
    a.src.includes('keeper'),
  );
  expect(keepers.length).toBe(1);
});
