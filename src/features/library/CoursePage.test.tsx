import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import { CoursePage } from './CoursePage';

afterEach(cleanup);

test('страница seed-курса: фаза, элементы по order со ссылками и заметкой', () => {
  render(<CoursePage id="seed-trex-intro" />);

  expect(screen.getByText('Вводная программа (заготовка)')).toBeTruthy();
  expect(screen.getByText('Фаза 1: база')).toBeTruthy();
  expect(screen.getByText('Разминка дома')).toBeTruthy();

  const links = Array.from(document.querySelectorAll('a[href^="#/drill/"]')) as HTMLAnchorElement[];
  expect(links.length).toBe(2);
  expect(links[0]?.getAttribute('href')).toBe('#/drill/seed-wall-dry');
  expect(links[0]?.textContent).toContain('Стена (сухая)');
  expect(links[1]?.getAttribute('href')).toBe('#/drill/seed-bill-drill-carbine');
});

test('несуществующий id → «Курс не найден»', () => {
  render(<CoursePage id="no-such-course" />);
  expect(screen.getByText('Курс не найден')).toBeTruthy();
});
