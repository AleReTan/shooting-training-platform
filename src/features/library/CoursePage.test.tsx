import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import { CoursePage } from './CoursePage';

afterEach(cleanup);

test('страница курса: фаза, элементы по order со ссылками и заметкой', () => {
  render(<CoursePage id="trex-carbine" />);

  expect(screen.getByText('T-Rex Arms: карабинный путь')).toBeTruthy();
  expect(screen.getByText('Фаза 1: база — хват, зрение, темп')).toBeTruthy();
  expect(screen.getByText(/Классика Билла Уилсона/)).toBeTruthy();

  const links = Array.from(document.querySelectorAll('a[href^="#/drill/"]')) as HTMLAnchorElement[];
  expect(links.length).toBe(10);
  expect(links[0]?.getAttribute('href')).toBe('#/drill/bill-drill-carbine');
  expect(links[0]?.textContent).toContain('Билл');
  expect(links[1]?.getAttribute('href')).toBe('#/drill/trex-vice-pres');
});

test('несуществующий id → «Курс не найден»', () => {
  render(<CoursePage id="no-such-course" />);
  expect(screen.getByText('Курс не найден')).toBeTruthy();
});
