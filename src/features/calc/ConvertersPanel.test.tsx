import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { ConvertersPanel } from './ConvertersPanel';

afterEach(cleanup);

const val = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

test('дистанция: правишь любую сторону, вторая пересчитывается', () => {
  render(<ConvertersPanel />);
  expect(val('метры')).toBe('100');
  expect(val('ярды')).toBe('109.36');

  fireEvent.input(screen.getByLabelText('ярды'), { target: { value: '50' } });
  expect(val('метры')).toBe('45.72');
});

test('вес пули: 125 гран ≈ 8.1 г', () => {
  render(<ConvertersPanel />);
  expect(val('граны')).toBe('125');
  expect(val('граммы')).toBe('8.1');

  fireEvent.input(screen.getByLabelText('граммы'), { target: { value: '9.6' } });
  expect(val('граны')).toBe('148.15');
});

test('поправка: 2 MIL на 300 м = 60 см; MOA считается тоже', () => {
  render(<ConvertersPanel />);
  expect(screen.getByText('= 10 см')).toBeTruthy(); // 1 MIL @ 100 м

  fireEvent.input(screen.getByLabelText('угол'), { target: { value: '2' } });
  fireEvent.input(screen.getByLabelText('дистанция, м'), { target: { value: '300' } });
  expect(screen.getByText('= 60 см')).toBeTruthy();

  fireEvent.click(screen.getByRole('radio', { name: 'MOA' }));
  expect(screen.getByText('= 17.45 см')).toBeTruthy(); // 2 MOA @ 300 м
});
