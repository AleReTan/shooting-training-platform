import { test, expect } from 'vitest';
import { currentHashPath, navigate } from './router';

test('currentHashPath: пустой хеш → "/"', () => {
  window.location.hash = '';
  expect(currentHashPath()).toBe('/');
});

test('currentHashPath: "#/drill/x" → "/drill/x"', () => {
  window.location.hash = '#/drill/x';
  expect(currentHashPath()).toBe('/drill/x');
});

test('navigate меняет хеш', () => {
  navigate('/timer');
  expect(window.location.hash).toBe('#/timer');
  expect(currentHashPath()).toBe('/timer');
});
