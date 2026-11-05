import { test, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import trexCourse from '../../../data/courses/trex-carbine.json';
import { loadData } from '../../data/load';
import { CourseCard } from './CourseCard';
import type { Course, Drill } from '../../data/types';

afterEach(cleanup);

let drillById: Map<string, Drill>;
beforeAll(async () => {
  const data = await loadData();
  drillById = new Map(data.drills.map((d) => [d.id, d]));
});

const course = trexCourse as Course;

test('карточка курса: агрегаты упражнений, патронов, фаз', () => {
  const { container } = render(<CourseCard course={course} drillById={drillById} />);
  expect(container.textContent).toContain('10 упражнений');
  expect(container.textContent).toContain('234 патр.');
  expect(container.textContent).toContain('4 фазы');
});

test('сложность курса — диапазон: залиты риски от min до max', () => {
  const { container } = render(<CourseCard course={course} drillById={drillById} />);
  const ticks = container.querySelector('.drill-card__ticks');
  expect(ticks?.getAttribute('aria-label')).toBe('сложность упражнений 2–5 из 5');
  expect(container.querySelectorAll('.tick--on').length).toBe(4);
});

test('карточка курса: ссылка на курс и описание', () => {
  const { container } = render(<CourseCard course={course} drillById={drillById} />);
  expect(container.querySelector('a')?.getAttribute('href')).toBe('#/course/trex-carbine');
  expect(container.textContent).toContain('Программа по официальным материалам');
});
