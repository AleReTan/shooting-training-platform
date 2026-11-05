import { test, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import App from './App';

test('App показывает заголовок «Стрелковые тренировки»', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Стрелковые тренировки',
  );
  cleanup();
});

test('App: «Загрузка…» до готовности данных, затем каталог', async () => {
  render(<App />);
  // оболочка красится сразу, данные приезжают асинхронным чанком
  expect(screen.getByText('Загрузка…')).toBeTruthy();
  await screen.findByText('Каталог упражнений');
  cleanup();
});
