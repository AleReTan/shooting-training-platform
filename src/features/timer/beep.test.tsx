import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import type * as Beep from './beep';

// Модуль хранит ctx/els/keeper между тестами — каждый тест берёт свежий
// экземпляр, иначе suspended-тест увидит чужой running-контекст.
let beep: typeof Beep.beep;
let unlockAudio: typeof Beep.unlockAudio;
let keepAudioAwake: typeof Beep.keepAudioAwake;
let releaseAudioAwake: typeof Beep.releaseAudioAwake;

// jsdom не умеет играть медиа — подменяем play/pause на учёт вызовов.
const played: HTMLAudioElement[] = [];
const pausedEls: HTMLAudioElement[] = [];

// Web Audio jsdom тоже не умеет — заглушка с записью осцилляторов.
const oscs: { type: string; freq: number; started: boolean; stopped: boolean }[] = [];
let resumeKeepsSuspended = false;

// jsdom не отражает playing в paused (геттер) — помечаем на инстансе
const markPlaying = (el: HTMLAudioElement) =>
  Object.defineProperty(el, 'paused', { value: false, configurable: true });

function installFakeAudioContext() {
  class FakeGain {
    connect = (n: unknown) => n;
    gain = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
  }
  class FakeOsc {
    type = '';
    frequency = { value: 0 };
    started = false;
    stopped = false;
    connect = (n: unknown) => n;
    start = () => {
      this.started = true;
      oscs.push({ type: this.type, freq: this.frequency.value, started: true, stopped: false });
    };
    stop = () => {
      this.stopped = true;
      const rec = oscs[oscs.length - 1];
      if (rec) rec.stopped = true;
    };
  }
  class FakeCtx {
    state = 'suspended';
    currentTime = 100;
    destination = {};
    resume() {
      if (!resumeKeepsSuspended) this.state = 'running';
      return Promise.resolve();
    }
    createOscillator() {
      return new FakeOsc();
    }
    createGain() {
      return new FakeGain();
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx);
}

beforeEach(async () => {
  vi.resetModules();
  ({ beep, unlockAudio, keepAudioAwake, releaseAudioAwake } = await import('./beep'));
  played.length = 0;
  pausedEls.length = 0;
  oscs.length = 0;
  resumeKeepsSuspended = false;
  HTMLMediaElement.prototype.play = function (this: HTMLAudioElement) {
    played.push(this);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function (this: HTMLAudioElement) {
    pausedEls.push(this);
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  document.querySelectorAll('audio').forEach((a) => a.remove());
});

test('без Web Audio сигнал играет через audio-элемент — медиа-канал', () => {
  beep('start');
  expect(played.length).toBe(1);
});

test('unlockAudio по жесту заводит Web Audio-контекст', () => {
  installFakeAudioContext();
  unlockAudio();
  // контекст создан и резюмится — без жеста iOS оставил бы его suspended
  beep('start'); // ctx.state ещё мог не стать running — путь не важен, не падает
});

test('сигнал идёт осциллятором, когда контекст жив и держатель играет сессию', () => {
  installFakeAudioContext();
  unlockAudio(); // жест: контекст → running
  keepAudioAwake();
  const keeper = played.at(-1)!;
  markPlaying(keeper); // медиа-сессия активна — Web Audio не глушит беззвучный режим
  beep('start');
  expect(oscs.length).toBe(1);
  expect(oscs[0]!.freq).toBe(1200); // старт 1200 Гц, как прежний wav
  expect(oscs[0]!.started).toBe(true);
  expect(oscs[0]!.stopped).toBe(true);
  // медиа-элемент для сигнала не трогаем: он звучал бы на ~0,5 с позже — двойной сигнал
  const startPlays = played.filter((a) => a.src.includes('beep-start'));
  expect(startPlays.length).toBe(1); // только разблокировка
});

test('контекст suspended — сигнал в медиа-элемент', () => {
  installFakeAudioContext();
  resumeKeepsSuspended = true;
  unlockAudio();
  keepAudioAwake();
  markPlaying(played.at(-1)!);
  beep('par');
  expect(oscs.length).toBe(0);
  expect(played.some((a) => a.src.includes('beep-par'))).toBe(true);
});

test('держатель не играет — сигнал в медиа-элемент: осциллятор заглушил бы беззвучный режим', () => {
  installFakeAudioContext();
  unlockAudio();
  keepAudioAwake();
  // keeper.paused остался true — держатель умер/остановлен
  beep('stop');
  expect(oscs.length).toBe(0);
  expect(played.some((a) => a.src.includes('beep-stop'))).toBe(true);
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
