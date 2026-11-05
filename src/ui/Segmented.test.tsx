import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { Segmented } from './Segmented';

afterEach(cleanup);

const opts = [
  { value: '' as const, label: 'все' },
  { value: 'live' as const, label: 'огневые' },
  { value: 'dry' as const, label: 'холостые' },
];

test('радиогруппа: активный radio отмечен aria-checked и держит единственный таб-стоп', () => {
  const onChange = vi.fn();
  render(<Segmented ariaLabel="тип тренировки" value="live" options={opts} onChange={onChange} />);

  expect(screen.getByRole('radiogroup', { name: 'тип тренировки' })).toBeTruthy();
  const active = screen.getByRole('radio', { name: 'огневые' });
  expect(active.getAttribute('aria-checked')).toBe('true');
  expect(active.getAttribute('tabindex')).toBe('0');
  expect(screen.getByRole('radio', { name: 'все' }).getAttribute('tabindex')).toBe('-1');
  expect(screen.getByRole('radio', { name: 'холостые' }).getAttribute('aria-checked')).toBe('false');

  fireEvent.click(screen.getByRole('radio', { name: 'все' }));
  expect(onChange).toHaveBeenCalledWith('');
});

test('стрелки переключают вариант по кругу и переносят фокус', () => {
  const onChange = vi.fn();
  render(<Segmented ariaLabel="тип тренировки" value="live" options={opts} onChange={onChange} />);

  fireEvent.keyDown(screen.getByRole('radio', { name: 'огневые' }), { key: 'ArrowRight' });
  expect(onChange).toHaveBeenLastCalledWith('dry');
  expect(document.activeElement?.textContent).toBe('холостые');

  fireEvent.keyDown(screen.getByRole('radio', { name: 'огневые' }), { key: 'ArrowDown' });
  expect(onChange).toHaveBeenLastCalledWith('dry');

  fireEvent.keyDown(screen.getByRole('radio', { name: 'огневые' }), { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenLastCalledWith('');
  fireEvent.keyDown(screen.getByRole('radio', { name: 'огневые' }), { key: 'ArrowUp' });
  expect(onChange).toHaveBeenLastCalledWith('');
});
