import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/preact';
import { TimerPanel } from './TimerPanel';
import { beep, keepAudioAwake, releaseAudioAwake } from './beep';
import type { ParTime } from '../../data/types';

// beep подменяем шпионом (момент вызова — суть тестов ниже), unlockAudio реальный.
vi.mock('./beep', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./beep')>();
  return {
    ...actual,
    beep: vi.fn(),
    keepAudioAwake: vi.fn(),
    releaseAudioAwake: vi.fn(),
  };
});

const pars: ParTime[] = [
  { level: 'novice', time: 2.5 },
  { level: 'master', time: 1.8 },
];

// Размонтирование — при живых fake-таймерах (clearInterval попадает в цель
// и на упавшем expect), и только потом возврат реальных таймеров.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('чипы пар-таймов показывают русские уровни, а не сырые id', () => {
  render(<TimerPanel parTimes={pars} />);
  expect(screen.getByText(/новичок: 2\.5 с/)).toBeTruthy();
  expect(screen.getByText(/мастер: 1\.8 с/)).toBeTruthy();
  expect(screen.queryByText(/novice/)).toBeNull();
});

test('отрицательный пар-тайм зажимается в ноль', () => {
  render(<TimerPanel />);
  const input = screen.getByLabelText('Пар, с') as HTMLInputElement;
  fireEvent.input(input, { target: { value: '-3' } });
  expect(input.value).toBe('0');
});

test('Старт разблокирует звук по жесту: play для всех сигналов (iOS)', async () => {
  const plays: HTMLAudioElement[] = [];
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLAudioElement) {
    plays.push(this);
    return Promise.resolve();
  };
  try {
    render(<TimerPanel />);
    fireEvent.click(screen.getByText('Старт'));
    // unlockAudio играет и сразу ставит паузу каждый сигнал — жест «Старт» это разрешает.
    await waitFor(() => expect(plays.length).toBeGreaterThanOrEqual(3));
  } finally {
    HTMLMediaElement.prototype.play = orig;
  }
});

test('сигналы старта и пар-тайма звучат в назначенный момент, а не на тике интервала', () => {
  const beepMock = vi.mocked(beep);
  beepMock.mockClear();
  const rand = vi.spyOn(Math, 'random').mockReturnValue(0); // задержка ровно 1 с
  vi.useFakeTimers();
  try {
    render(<TimerPanel />);
    // пар 2.25 с — parAt на 3250 мс, между тиками интервала (3000 и 3300)
    fireEvent.input(screen.getByLabelText('Пар, с'), { target: { value: '2.25' } });
    fireEvent.click(screen.getByText('Старт'));

    act(() => { vi.advanceTimersByTime(999); });
    expect(beepMock).not.toHaveBeenCalledWith('start');
    act(() => { vi.advanceTimersByTime(1); }); // t=1000: момент startedAt
    expect(beepMock).toHaveBeenCalledWith('start');

    act(() => { vi.advanceTimersByTime(2249); });
    expect(beepMock).not.toHaveBeenCalledWith('par');
    act(() => { vi.advanceTimersByTime(1); }); // t=3250: момент parAt, тик был бы лишь на 3300
    expect(beepMock).toHaveBeenCalledWith('par');
  } finally {
    rand.mockRestore();
  }
});

test('Стоп во время задержки отменяет ещё не прозвучавший сигнал старта', () => {
  const beepMock = vi.mocked(beep);
  beepMock.mockClear();
  const rand = vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.useFakeTimers();
  try {
    render(<TimerPanel />);
    fireEvent.click(screen.getByText('Старт'));
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.click(screen.getByText('Стоп'));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(beepMock).not.toHaveBeenCalledWith('start');
    expect(beepMock).toHaveBeenCalledWith('stop');
    // держатель канала живёт на время работы и гаснет на Стопе
    expect(keepAudioAwake).toHaveBeenCalled();
    expect(releaseAudioAwake).toHaveBeenCalled();
  } finally {
    rand.mockRestore();
  }
});

test('пар = 0: сигнал пар-тайма не сливается с сигналом старта', () => {
  const beepMock = vi.mocked(beep);
  beepMock.mockClear();
  const rand = vi.spyOn(Math, 'random').mockReturnValue(0); // задержка ровно 1 с
  vi.useFakeTimers();
  try {
    render(<TimerPanel />);
    fireEvent.input(screen.getByLabelText('Пар, с'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Старт'));

    act(() => { vi.advanceTimersByTime(1000); }); // t=1000: сигнал старта
    expect(beepMock).toHaveBeenCalledWith('start');
    expect(beepMock).not.toHaveBeenCalledWith('par');
    act(() => { vi.advanceTimersByTime(199); });
    expect(beepMock).not.toHaveBeenCalledWith('par');
    act(() => { vi.advanceTimersByTime(1); }); // t=1200: пар-тайм — отдельно от старта
    expect(beepMock).toHaveBeenCalledWith('par');
  } finally {
    rand.mockRestore();
  }
});

test('пар на часы вперёд не звучит сразу после старта (переполнение setTimeout)', () => {
  const beepMock = vi.mocked(beep);
  beepMock.mockClear();
  const rand = vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.useFakeTimers();
  try {
    render(<TimerPanel />);
    // 3 000 000 с ≈ 35 суток: задержка таймаута > 2^31−1 мс
    fireEvent.input(screen.getByLabelText('Пар, с'), { target: { value: '3000000' } });
    fireEvent.click(screen.getByText('Старт'));
    act(() => { vi.advanceTimersByTime(4000); }); // задержка старта + запас
    expect(beepMock).toHaveBeenCalledWith('start');
    expect(beepMock).not.toHaveBeenCalledWith('par');
  } finally {
    rand.mockRestore();
  }
});

test('1e999 (Infinity) в «Пар, с» сбрасывается в «не задано»', () => {
  render(<TimerPanel />);
  const input = screen.getByLabelText('Пар, с') as HTMLInputElement;
  fireEvent.input(input, { target: { value: '1e999' } });
  expect(input.value).toBe('');
});

test('лок, полученный после Стопа, освобождается сразу, а не висит до закрытия вкладки', async () => {
  const release = vi.fn(async () => {});
  let resolveRequest!: (v: { release: () => Promise<void> }) => void;
  const request = new Promise<{ release: () => Promise<void> }>((r) => {
    resolveRequest = r;
  });
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: () => request },
  });
  try {
    render(<TimerPanel />);
    fireEvent.click(screen.getByText('Старт'));
    fireEvent.click(screen.getByText('Стоп'));
    resolveRequest({ release }); // ответ пришёл уже после Стопа
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  } finally {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: undefined,
    });
  }
});

test('wake lock освобождается при размонтировании во время работы таймера', async () => {
  const release = vi.fn(async () => {});
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => ({ release }) },
  });
  try {
    render(<TimerPanel />);
    fireEvent.click(screen.getByText('Старт'));
    // Даём асинхронному acquireWakeLock довести лок до wakeRef.
    await new Promise((r) => setTimeout(r, 10));

    cleanup();
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  } finally {
    // Убираем заглушку, чтобы не протекала в другие тесты.
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: undefined,
    });
  }
});
