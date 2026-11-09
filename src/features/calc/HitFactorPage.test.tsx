import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { HitFactorPage } from './HitFactorPage';

afterEach(cleanup);

const inc = (label: string) => {
  const row = screen.getByLabelText(label).closest('.hf-zone') as HTMLElement;
  fireEvent.click(row.querySelector('button.hf-zone__plus') as HTMLElement);
};

test('конвертеры вынесены со страницы хит-фактора', () => {
  render(<HitFactorPage />);
  expect(screen.queryByRole('heading', { name: 'Конвертеры' })).toBeNull();
  expect(screen.queryByLabelText('метры')).toBeNull();
});

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
  fireEvent.click(screen.getByRole('radio', { name: 'major' }));
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

test('целевой HF ≤ 0 не даёт отрицательных подсказок', () => {
  render(<HitFactorPage />);
  inc('зона A');
  fireEvent.input(screen.getByLabelText('Время, с'), { target: { value: '5.5' } });
  fireEvent.input(screen.getByLabelText('Целевой HF'), { target: { value: '-2' } });
  expect(screen.queryByText(/нужно/)).toBeNull();
  expect(screen.queryByText(/уложиться/)).toBeNull();
});

test('дробное число попаданий не даёт дробных очков', () => {
  render(<HitFactorPage />);
  fireEvent.input(screen.getByLabelText('зона A'), { target: { value: '2.5' } });
  expect(screen.getByText('10')).toBeTruthy(); // floor(2.5) = 2 попадания → 2×5
});

test('склонение: нужно 21 очко, а не «21 очков»', () => {
  render(<HitFactorPage />);
  fireEvent.input(screen.getByLabelText('Время, с'), { target: { value: '1.4' } });
  fireEvent.input(screen.getByLabelText('Целевой HF'), { target: { value: '15' } });
  expect(screen.getByText(/нужно 21 очко за это время/)).toBeTruthy();
});
