import { test, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { DrillPage } from './DrillPage';
import { loadData, type AppData } from '../../data/load';

let data: AppData;
beforeAll(async () => {
  data = await loadData();
});

afterEach(cleanup);

test('карточка Bill Drill: имя, шаги, пар-таймы, курс, схема', () => {
  render(<DrillPage id="bill-drill-carbine" data={data} />);

  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.getByText(/Bill Wilson/)).toBeTruthy();

  // шаги — нумерованным списком
  const steps = document.querySelectorAll('ol li');
  expect(steps.length).toBe(3);
  expect(steps[0]?.textContent).toContain('Карабин в готовности');

  // пар-таймы — таблицей
  expect(document.querySelector('table')).toBeTruthy();
  expect(screen.getByText('2.5 с')).toBeTruthy();

  // SVG-схема с плеером
  expect(document.querySelector('svg.diagram')).toBeTruthy();
  expect(screen.getByText('Шаг вперёд')).toBeTruthy();

  // курс, куда входит упражнение
  expect(screen.getByText('Входит в курсы')).toBeTruthy();
  expect(screen.getByText('T-Rex Arms: карабинный путь')).toBeTruthy();

  // тип тренировки — «огневая», не «боевая»
  const meta = document.querySelector('.drill-card__meta')?.textContent ?? '';
  expect(meta).toContain('огневая');
  expect(meta).not.toContain('боевая');
});

test('карточка Стены: тип «холостая», не «сухая»', () => {
  render(<DrillPage id="wall-dry" data={data} />);
  expect(screen.getByText('Стена (холостая)')).toBeTruthy();
  const meta = document.querySelector('.drill-card__meta')?.textContent ?? '';
  expect(meta).toContain('холостая');
  expect(meta).not.toContain('сухая');
  expect(meta).not.toContain('0 патр.'); // без патронов — без пустого счётчика
});

test('needsReview: на карточке видна пометка «на проверке»', () => {
  render(<DrillPage id="import-shootie-zmejkoj-begit" data={data} />);
  expect(screen.getByText('на проверке')).toBeTruthy();
  expect(
    document.querySelector('.drill-page__review')?.textContent,
  ).toContain('сверь с первоисточником');
});

test('печать: кнопка вызывает window.print, шум уходит с листа', () => {
  const orig = window.print;
  window.print = vi.fn();
  try {
    render(<DrillPage id="bill-drill-carbine" data={data} />);
    fireEvent.click(screen.getByText('печать'));
    expect(window.print).toHaveBeenCalled();
    // таймер и прочие не-бумажные блоки помечены no-print (скрыты стилями печати)
    expect(document.querySelector('.no-print .timer')).toBeTruthy();
    expect(document.querySelectorAll('.no-print').length).toBeGreaterThanOrEqual(2);
  } finally {
    window.print = orig;
  }
});

test('несуществующий id → «Упражнение не найдено» и ссылка в каталог', () => {
  render(<DrillPage id="no-such-drill" data={data} />);
  expect(screen.getByText('Упражнение не найдено')).toBeTruthy();
  const back = screen.getByText('← В каталог') as HTMLAnchorElement;
  expect(back.getAttribute('href')).toBe('#/');
});
