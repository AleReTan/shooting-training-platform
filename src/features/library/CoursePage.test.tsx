import { test, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import { CoursePage } from './CoursePage';
import { loadData, type AppData } from '../../data/load';

let data: AppData;
beforeAll(async () => {
  data = await loadData();
});

afterEach(cleanup);

test('страница курса: фаза, элементы по order со ссылками и заметкой', () => {
  render(<CoursePage id="trex-carbine" data={data} />);

  expect(screen.getByText('T-Rex Arms: карабинный путь')).toBeTruthy();
  expect(screen.getByText('Фаза 1: база — хват, зрение, темп')).toBeTruthy();
  expect(screen.getByText(/Классика Билла Уилсона/)).toBeTruthy();

  const links = Array.from(document.querySelectorAll('a[href^="#/drill/"]')) as HTMLAnchorElement[];
  expect(links.length).toBe(10);
  expect(links[0]?.getAttribute('href')).toBe('#/drill/bill-drill-carbine');
  expect(links[0]?.textContent).toContain('Билл');
  expect(links[1]?.getAttribute('href')).toBe('#/drill/trex-vice-pres');
});

test('страница курса: упражнения карточками по порядку, шапка с цифрами и профилем сложности', () => {
  const { container } = render(<CoursePage id="trex-carbine" data={data} />);

  // карточка на каждое упражнение, номер шага — общий по курсу, а не внутри фазы
  const steps = Array.from(container.querySelectorAll('.course-item__step')).map((el) => el.textContent);
  expect(steps).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  expect(container.querySelectorAll('.course-item .tick--on').length).toBe(2 + 3 + 3 + 3 + 3 + 3 + 4 + 3 + 4 + 5);

  // шапка: цифры курса и столбик сложности на каждое упражнение
  const meta = container.querySelector('.course-hero__meta')?.textContent ?? '';
  expect(meta).toContain('10 упражнений');
  expect(meta).toContain('232 патр.');
  expect(container.querySelectorAll('.course-hero__bar').length).toBe(10);
  expect(container.querySelector('.course-hero__source')?.textContent).toContain('T-Rex Arms');
});

test('несуществующий id → «Курс не найден»', () => {
  render(<CoursePage id="no-such-course" data={data} />);
  expect(screen.getByText('Курс не найден')).toBeTruthy();
});
