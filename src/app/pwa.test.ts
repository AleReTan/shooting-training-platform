import { test, expect } from 'vitest';
import { shouldShowUpdate } from './pwa';

test('shouldShowUpdate: тост скрыт, пока нет ждущего воркера', () => {
  expect(shouldShowUpdate(false)).toBe(false);
});

test('shouldShowUpdate: ждущий воркер → тост виден', () => {
  expect(shouldShowUpdate(true)).toBe(true);
});
