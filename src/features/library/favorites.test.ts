import { test, expect, beforeEach } from 'vitest';
import { loadFavorites, saveFavorites, toggleFavorite } from './favorites';

beforeEach(() => {
  window.localStorage.clear();
});

test('toggle: добавляет и убирает', () => {
  const a = toggleFavorite([], 'x');
  expect(a).toEqual(['x']);
  const b = toggleFavorite(a, 'y');
  expect(b).toEqual(['x', 'y']);
  expect(toggleFavorite(b, 'x')).toEqual(['y']);
});

test('save/load — полный цикл', () => {
  saveFavorites(['a', 'b']);
  expect(loadFavorites()).toEqual(['a', 'b']);
});

test('битый JSON и пустое хранилище — пустой список', () => {
  expect(loadFavorites()).toEqual([]);
  window.localStorage.setItem('shooting-favorites-v1', '{не json');
  expect(loadFavorites()).toEqual([]);
});
