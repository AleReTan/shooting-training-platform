import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import App from './App';

test('App показывает заголовок «Стрелковые тренировки»', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Стрелковые тренировки',
  );
});
