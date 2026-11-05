// Сбой загрузки данных: экран ошибки вместо вечной «Загрузка…», кнопка повтора.

import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import App from './App';

const { loadDataMock } = vi.hoisted(() => ({ loadDataMock: vi.fn() }));
vi.mock('../data/load', () => ({ loadData: loadDataMock }));

const okData = {
  drills: [],
  drillById: new Map(),
  courses: [],
  courseById: new Map(),
  coursesByDrillId: new Map(),
  taxonomy: { tags: [], targetTypes: [], parLevels: [] },
};

afterEach(cleanup);

test('сбой загрузки: экран ошибки, повтор грузит заново', async () => {
  loadDataMock.mockRejectedValueOnce(new Error('network'));
  loadDataMock.mockResolvedValueOnce(okData);

  render(<App />);

  // Не «Загрузка…» навсегда, а явная ошибка.
  expect(await screen.findByText('Не удалось загрузить данные', undefined, { timeout: 2000 })).toBeTruthy();

  fireEvent.click(screen.getByText('Повторить'));
  await waitFor(() => expect(screen.getByText('Каталог упражнений')).toBeTruthy());
  expect(loadDataMock).toHaveBeenCalledTimes(2);
});
