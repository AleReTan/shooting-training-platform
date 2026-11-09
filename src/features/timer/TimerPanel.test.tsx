import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/preact';
import { TimerPanel } from './TimerPanel';
import { beep } from './beep';
import type { ParTime } from '../../data/types';

// beep подменяем шпионом (момент вызова — суть тестов ниже), unlockAudio реальный.
vi.mock('./beep', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./beep')>();
  return { ...actual, beep: vi.fn() };
});

const pars: ParTime[] = [
  { level: 'novice', time: 2.5 },
  { level: 'master', time: 1.8 },
];

afterEach(cleanup);

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
    vi.useRealTimers();
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
  } finally {
    vi.useRealTimers();
    rand.mockRestore();
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
