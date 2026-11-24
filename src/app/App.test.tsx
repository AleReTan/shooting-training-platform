import { test, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import App from './App';
import { shortId } from '../data/shortId';

test('App показывает заголовок «Стрелковые тренировки»', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Стрелковые тренировки',
  );
  cleanup();
});

test('App: «Загрузка…» до готовности данных, затем каталог', async () => {
  render(<App />);
  // оболочка красится сразу, данные приезжают асинхронным чанком (~0,4 МБ):
  // дефолтной секунды findByText под нагрузкой CI-раннера не хватает
  expect(screen.getByText('Загрузка…')).toBeTruthy();
  await screen.findByText('Каталог упражнений', {}, { timeout: 5000 });
  cleanup();
});

test('App: #/d/<код> — короткая ссылка открывает упражнение; незнакомый код → «не найдено»', async () => {
  window.location.hash = `#/d/${shortId('bill-drill-carbine')}`;
  render(<App />);
  await screen.findByRole('heading', { level: 2, name: 'Билл Дрилл (карабин)' }, { timeout: 5000 });
  cleanup();

  window.location.hash = '#/d/zzzzzz';
  render(<App />);
  await screen.findByText('Упражнение не найдено', {}, { timeout: 5000 });
  cleanup();
  window.location.hash = '';
});

test('App: #/conv — конвертеры отдельным разделом, с ссылкой в навигации', async () => {
  window.location.hash = '#/conv';
  render(<App />);
  await screen.findByRole('heading', { level: 2, name: 'Конвертеры' }, { timeout: 5000 });
  expect(screen.queryByRole('heading', { name: 'Калькулятор хит-фактора' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Конвертеры' })).toBeTruthy();
  cleanup();
  window.location.hash = '';
});
