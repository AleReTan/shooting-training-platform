import { test, expect, beforeEach, afterEach } from 'vitest';
import { beep, unlockAudio } from './beep';

// jsdom не умеет играть медиа — подменяем play/pause на учёт вызовов.
const played: HTMLAudioElement[] = [];

beforeEach(() => {
  played.length = 0;
  HTMLMediaElement.prototype.play = function (this: HTMLAudioElement) {
    played.push(this);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};
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
