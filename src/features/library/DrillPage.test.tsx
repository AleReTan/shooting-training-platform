import { test, expect, afterEach, beforeAll, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { DrillPage } from './DrillPage';
import { loadData, type AppData } from '../../data/load';
import { shortId } from '../../data/shortId';

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

test('share: кнопка «копировать ссылку» копирует короткий адрес упражнения и подтверждает', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  render(<DrillPage id="bill-drill-carbine" data={data} />);
  fireEvent.click(screen.getByText('копировать ссылку'));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  const url = writeText.mock.calls[0]?.[0] as string;
  // короткий роут #/d/<код>, код детерминирован по id
  expect(url.endsWith(`/#/d/${shortId('bill-drill-carbine')}`)).toBe(true);
  expect(screen.getByText('скопировано')).toBeTruthy();
});

test('бланк источника: внешней ссылки на CDN больше нет — она не открывается', () => {
  render(<DrillPage id="trex-50-round-cof" data={data} />);
  expect(document.querySelector('.drill-page__form')).toBeNull();
  expect(document.querySelector('a[href*="img.trex-arms.com"]')).toBeNull();
});

test('бланк источника картинкой: сворачивающийся блок, файл лежит в public/, без навигации', () => {
  render(<DrillPage id="trex-50-round-cof" data={data} />);
  const img = document.querySelector('.drill-page__form-img img');
  expect(img?.getAttribute('src')).toBe('media/trex/50rd-carbine-cof.webp');

  // service worker отвечает на любую навигацию оболочкой приложения: картинка
  // не должна вести себя как ссылка (в т.ч. target="_blank") — иначе PWA виснет
  expect(img?.closest('a')).toBeNull();
  expect(document.querySelector('.drill-page__form-img a')).toBeNull();

  // блок стоит сразу под заголовком схемы, до самой схемы
  const first = document.querySelector('h3 + details.drill-page__form-img');
  expect(first).toBeTruthy();

  // битого пути к картинке быть не должно — иначе блок раскрывается в пустоту
  for (const d of data.drills) {
    for (const i of d.media?.images ?? []) {
      if (i.file) expect(existsSync(join('public', i.file)), `${d.id}: ${i.file}`).toBe(true);
    }
  }
});

test('бланк источника: нажатие приближает картинку на месте, без перехода', () => {
  render(<DrillPage id="trex-50-round-cof" data={data} />);
  const toggle = document.querySelector('.drill-page__form-zoom') as HTMLElement;
  expect(toggle.tagName).toBe('BUTTON');
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
});

test('несуществующий id → «Упражнение не найдено» и ссылка в каталог', () => {
  render(<DrillPage id="no-such-drill" data={data} />);
  expect(screen.getByText('Упражнение не найдено')).toBeTruthy();
  const back = screen.getByText('← В каталог') as HTMLAnchorElement;
  expect(back.getAttribute('href')).toBe('#/');
});
