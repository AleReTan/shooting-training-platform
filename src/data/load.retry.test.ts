// Сбой загрузки контентного чанка не кешируется: повторный вызов loadData
// должен пробовать снова, а не возвращать тот же реджект.

import { test, expect, vi } from 'vitest';

const state = vi.hoisted(() => ({ fail: true }));

test('loadData: сбой не кешируется — повтор грузит заново', async () => {
  vi.doMock('./content', () => {
    if (state.fail) throw new Error('chunk fail');
    return {
      rawDrills: [],
      rawCourses: [],
      rawTaxonomy: { tags: [], targetTypes: [], parLevels: [] },
    };
  });
  vi.resetModules();

  const { loadData } = await import('./load');
  // Витест оборачивает ошибку кидающей фабрики своим сообщением —
  // здесь важно само поведение: реджект, а не зависший промис.
  await expect(loadData()).rejects.toThrow();

  state.fail = false;
  const data = await loadData();
  expect(data.drills).toEqual([]);

  vi.doUnmock('./content');
  vi.resetModules();
});
