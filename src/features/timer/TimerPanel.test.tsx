import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { TimerPanel } from './TimerPanel';
import type { ParTime } from '../../data/types';

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
