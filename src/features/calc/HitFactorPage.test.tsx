import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { HitFactorPage } from './HitFactorPage';

afterEach(cleanup);

const inc = (label: string) => {
  const row = screen.getByLabelText(label).closest('.hf-zone') as HTMLElement;
  fireEvent.click(row.querySelector('button.hf-zone__plus') as HTMLElement);
};

test('считает хит-фактор: зоны → очки → очки/время', () => {
  render(<HitFactorPage />);
  inc('зона A');
  inc('зона A');
  inc('зона C');
  // minor: 2×5 + 1×3 = 13 очков
  fireEvent.input(screen.getByLabelText('Время, с'), { target: { value: '6.5' } });
  expect(screen.getByText('13')).toBeTruthy(); // очки
  expect(screen.getByText('2.00')).toBeTruthy(); // HF = 13/6.5
});

test('мощность major меняет цену зон C и D', () => {
  render(<HitFactorPage />);
  inc('зона A');
  inc('зона C');
  expect(screen.getByText('8')).toBeTruthy(); // minor 5+3
  fireEvent.click(screen.getByRole('button', { name: 'major' }));
  expect(screen.getByText('9')).toBeTruthy(); // major 5+4
});

test('цель по HF: требуемые очки и требуемое время', () => {
  render(<HitFactorPage />);
  inc('зона A'); // 5 очков
  fireEvent.input(screen.getByLabelText('Время, с'), { target: { value: '10' } });
  fireEvent.input(screen.getByLabelText('Целевой HF'), { target: { value: '10' } });
  // за 10 с нужно 100 очков; с 5 очками нужно 0.5 с
  expect(screen.getByText(/100 очков/)).toBeTruthy();
  expect(screen.getByText(/0\.50 с/)).toBeTruthy();
});
