import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { Segmented } from './Segmented';

afterEach(cleanup);

test('сегменты: активный помечен aria-pressed, клик отдаёт значение', () => {
  const onChange = vi.fn();
  render(
    <Segmented
      ariaLabel="тип тренировки"
      value="live"
      options={[
        { value: '', label: 'все' },
        { value: 'live', label: 'огневые' },
        { value: 'dry', label: 'холостые' },
      ]}
      onChange={onChange}
    />,
  );
  const group = screen.getByRole('group', { name: 'тип тренировки' });
  expect(group).toBeTruthy();
  expect(screen.getByRole('button', { name: 'огневые' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'все' }).getAttribute('aria-pressed')).toBe('false');

  fireEvent.click(screen.getByRole('button', { name: 'все' }));
  expect(onChange).toHaveBeenCalledWith('');
});
