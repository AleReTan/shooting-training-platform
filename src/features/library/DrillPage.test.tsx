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

const text = (sel: string) => document.querySelector(sel)?.textContent ?? '';

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
  expect(screen.getByRole('link', { name: 'T-Rex Arms: карабинный путь' })).toBeTruthy();

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

const fold = (name: string) =>
  [...document.querySelectorAll<HTMLDetailsElement>('details.drill-page__fold')].find(
    (d) => d.querySelector(':scope > summary')?.textContent === name,
  );

test('схема и таймер — свёрнутые блоки: раскрываются по запросу, на печать схема попадает', () => {
  render(<DrillPage id="trex-50-round-cof" data={data} />);
  const schema = fold('Схема');
  const timer = fold('Таймер');
  expect(schema?.querySelector('svg.diagram')).toBeTruthy();
  expect(timer?.querySelector('.timer')).toBeTruthy();
  // по умолчанию закрыты: развёрнутые «болтаются на экране»
  expect(schema?.open).toBe(false);
  expect(timer?.open).toBe(false);

  const orig = window.print;
  window.print = vi.fn();
  try {
    fireEvent.click(screen.getByText('печать'));
    // закрытый <details> не печатается — схема должна попасть на лист
    expect(schema?.open).toBe(true);
  } finally {
    window.print = orig;
  }
});

test('назад из упражнения курса — к курсу; упражнение вне курсов — в каталог', () => {
  const { rerender } = render(<DrillPage id="bill-drill-carbine" data={data} />);
  const back = () => document.querySelector('.drill-page__nav a') as HTMLAnchorElement;
  expect(back().getAttribute('href')).toBe('#/course/trex-carbine');
  expect(back().textContent).toContain('T-Rex Arms: карабинный путь');

  rerender(<DrillPage id="the-wall" data={data} />);
  expect(back().getAttribute('href')).toBe('#/');
});

test('упражнение CLIFF: в источнике — ссылка на Telegram автора', () => {
  render(<DrillPage id="the-wall" data={data} />);
  const link = document.querySelector<HTMLAnchorElement>('a[href="https://t.me/beard_cliff"]');
  expect(link).toBeTruthy();
  expect(link?.closest('p')?.textContent).toContain('Источник: CLIFF');
});

test('другое упражнение не наследует ввод: лист подсчёта и пар-тайм начинаются заново', () => {
  const { rerender } = render(<DrillPage id="trex-50-round-cof" data={data} />);
  fireEvent.input(screen.getByLabelText('Серия 1, время, с'), { target: { value: '5' } });
  fireEvent.input(screen.getByLabelText('Мишень 1, зона A'), { target: { value: '2' } });
  rerender(<DrillPage id="the-wall" data={data} />);
  expect((screen.getByLabelText('Серия 1, время, с') as HTMLInputElement).value).toBe('');
  expect(text('.hfsheet__points')).toBe('Очки: 0');

  rerender(<DrillPage id="bill-drill-carbine" data={data} />);
  expect((screen.getByLabelText('Пар, с') as HTMLInputElement).value).toBe('4');
  rerender(<DrillPage id="the-wall" data={data} />);
  expect((screen.getByLabelText('Пар, с') as HTMLInputElement).value).toBe('');
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
  // и без своего зума: приближение и прокрутка — нативным щипком браузера
  // (кнопка с прокруткой в рамке была «слишком близко и неудобно двигать»)
  expect(document.querySelector('.drill-page__form-img button, .drill-page__form-img a')).toBeNull();

  // блок стоит внутри блока «Схема», до самой схемы
  const block = document.querySelector('details.drill-page__form-img');
  const diagram = document.querySelector('svg.diagram');
  expect(block).toBeTruthy();
  expect(
    block!.compareDocumentPosition(diagram!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  // битого пути к картинке быть не должно — иначе блок раскрывается в пустоту
  for (const d of data.drills) {
    for (const i of d.media?.images ?? []) {
      if (i.file) expect(existsSync(join('public', i.file)), `${d.id}: ${i.file}`).toBe(true);
    }
  }
});

test('условия — отдельным блоком до «Выполнения»: серии нумеруются с 1', () => {
  render(<DrillPage id="the-wall" data={data} />);
  expect(screen.getByRole('heading', { level: 3, name: 'Условия' })).toBeTruthy();
  expect(document.querySelector('.drill-page__setup')?.textContent).toContain('декорация на 25 м по центру');
  expect(document.querySelector('ol li')?.textContent).toMatch(/^Серия 1/);
});

test('ни в одном упражнении условия не сдвигают нумерацию серий', async () => {
  const { drills } = await loadData();
  const displaced = drills.filter((d) => {
    const i = (d.steps.ru ?? []).findIndex((s) => /^Серия 1\b/.test(s));
    return i > 0;
  });
  expect(displaced.map((d) => d.id)).toEqual([]);
});

test('лист подсчёта хит-фактора: есть у упражнений с хит-фактором, у остальных нет', () => {
  render(<DrillPage id="trex-50-round-cof" data={data} />);
  expect(document.querySelector('.hfsheet')).toBeTruthy();
  cleanup();
  render(<DrillPage id="bill-drill-carbine" data={data} />);
  expect(document.querySelector('.hfsheet')).toBeNull();
});

test('несуществующий id → «Упражнение не найдено» и ссылка в каталог', () => {
  render(<DrillPage id="no-such-drill" data={data} />);
  expect(screen.getByText('Упражнение не найдено')).toBeTruthy();
  const back = screen.getByText('← В каталог') as HTMLAnchorElement;
  expect(back.getAttribute('href')).toBe('#/');
});
