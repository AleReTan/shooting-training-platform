import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { ConvertersPage } from './ConvertersPage';

afterEach(cleanup);

const val = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

test('конвертеры — отдельная страница со своим заголовком', () => {
  render(<ConvertersPage />);
  expect(screen.getByRole('heading', { level: 2, name: 'Конвертеры' })).toBeTruthy();
});

test('дистанция: правишь любую сторону, вторая пересчитывается', () => {
  render(<ConvertersPage />);
  expect(val('метры')).toBe('100');
  expect(val('ярды')).toBe('109.36');

  fireEvent.input(screen.getByLabelText('ярды'), { target: { value: '50' } });
  expect(val('метры')).toBe('45.72');
});

test('вес пули: 125 гран ≈ 8.1 г', () => {
  render(<ConvertersPage />);
  expect(val('граны')).toBe('125');
  expect(val('граммы')).toBe('8.1');

  fireEvent.input(screen.getByLabelText('граммы'), { target: { value: '9.6' } });
  expect(val('граны')).toBe('148.15');
});

test('поправка: 2 MIL на 300 м = 60 см; MOA считается тоже', () => {
  render(<ConvertersPage />);
  const result = () => screen.getByRole('status').textContent;
  expect(result()).toBe('= 10 см'); // 1 MIL @ 100 м

  fireEvent.input(screen.getByLabelText('угол'), { target: { value: '2' } });
  fireEvent.input(screen.getByLabelText('дистанция, м'), { target: { value: '300' } });
  expect(result()).toBe('= 60 см');

  fireEvent.click(screen.getByRole('radio', { name: 'MOA' }));
  expect(result()).toBe('= 17.45 см'); // 2 MOA @ 300 м
});
