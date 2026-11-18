import { test, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import CatalogPage from './CatalogPage';
import { dailyDrillId, todayKey } from './daily';
import { loadData, type AppData } from '../../data/load';

let data: AppData;
beforeAll(async () => {
  data = await loadData();
});

afterEach(() => {
  cleanup();
  window.location.hash = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

test('каталог показывает упражнения (первый экран списка)', () => {
  render(<CatalogPage data={data} />);
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.getByText('Билл Дрилл (пистолет)')).toBeTruthy();
});

test('фильтры переживают возврат из упражнения в каталог', () => {
  const { unmount } = render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: 'холостые' }));
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'стена' } });
  unmount(); // ушли на страницу упражнения — каталог размонтировался

  render(<CatalogPage data={data} />);
  expect((screen.getByLabelText('Поиск') as HTMLInputElement).value).toBe('стена');
  expect(screen.getByRole('radio', { name: 'холостые' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByText('Стена (холостая)')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('поиск фильтрует карточки', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: '1-to-5' } });
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('фильтр «тип тренировки»: варианты «огневые» и «холостые»', () => {
  render(<CatalogPage data={data} />);
  const group = screen.getByRole('radiogroup', { name: 'тип тренировки' });
  expect(group.textContent).toContain('огневые');
  expect(group.textContent).toContain('холостые');
  expect(group.textContent).not.toContain('сухие');
  expect(group.textContent).not.toContain('боевые');
});

test('фильтр fireMode «холостые» оставляет только dry', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: 'холостые' }));
  expect(screen.getByText('Стена (холостая)')).toBeTruthy();
  expect(screen.queryByText('От 1 до 5')).toBeNull();
});

test('фильтр «Оружие: пистолет» оставляет пистолетные упражнения', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('Оружие'), { target: { value: 'pistol-traumatic' } });
  expect(screen.getByText('Билл Дрилл (пистолет)')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('сложность «лёгкая» (1–2) прячет третью и выше', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: 'лёгкая' }));
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy(); // сложность 2
  expect(screen.queryByText('3-V (USPSA 03-04)')).toBeNull(); // сложность 3
});

test('сложность «средняя» (3) прячет и лёгкие, и сложные', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: 'средняя' }));
  expect(screen.getByText('3-V (USPSA 03-04)')).toBeTruthy(); // сложность 3, ранний по сортировке
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull(); // сложность 2
  expect(screen.queryByText('Броня: марш и серия')).toBeNull(); // сложность 4
});

test('сложность «сложная» (4–5) прячет всё легче четвёртой', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: 'сложная' }));
  expect(screen.getByText('Броня: марш и серия')).toBeTruthy(); // сложность 4
  expect(screen.queryByText('3-V (USPSA 03-04)')).toBeNull(); // сложность 3
});

test('ряды тегов подписаны как группы (навыки, условия)', () => {
  render(<CatalogPage data={data} />);
  expect(screen.getByRole('group', { name: 'навыки' })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'условия' })).toBeTruthy();
});

test('чип тега «Первый выстрел» оставляет одно упражнение', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('button', { name: 'Первый выстрел' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('второй тап по чипу исключает тег (−режим), третий снимает', () => {
  render(<CatalogPage data={data} />);
  const chip = () => screen.getByRole('button', { name: /Первый выстрел/ });

  fireEvent.click(chip()); // фильтр: только «От 1 до 5»
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();

  fireEvent.click(chip()); // исключение: всё, кроме тега
  expect(chip().textContent).toContain('−');
  expect(chip().getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.queryByText('От 1 до 5')).toBeNull();

  fireEvent.click(chip()); // снят: счётчик снова полный
  expect(chip().getAttribute('aria-pressed')).toBe('false');
  const total = data.drills.length;
  expect(screen.getByText(`Найдено ${total} из ${total}`)).toBeTruthy();
});

test('тренировка дня выбирается из видимого списка — исключённый тег учтён', () => {
  render(<CatalogPage data={data} />);
  const chip = () => screen.getByRole('button', { name: /Первый выстрел/ });
  fireEvent.click(chip());
  fireEvent.click(chip()); // исключили first-shot

  const pool = data.drills.filter((d) => !d.tags.includes('first-shot'));
  const expected = dailyDrillId(pool.map((d) => d.id), todayKey());
  fireEvent.click(screen.getByText('тренировка дня'));
  expect(window.location.hash).toBe(`#/drill/${expected}`);
});

test('фильтр «Источник»: варианты сгруппированы по типу, выбор сужает список', () => {
  render(<CatalogPage data={data} />);
  const select = screen.getByLabelText('Источник') as HTMLSelectElement;
  expect(select.textContent).toContain('Общая практика карабинных курсов');
  expect(select.textContent).toContain('shootie.pro · Травма');

  fireEvent.change(select, { target: { value: 'Steel Challenge' } });
  expect(screen.queryByText('От 1 до 5')).toBeNull(); // Kyle Lamb, классика
  expect(document.querySelectorAll('.drill-card').length).toBeGreaterThan(0);
});

test('курсы показаны карточками с агрегатами', () => {
  render(<CatalogPage data={data} />);
  expect(screen.getByText('10 упражнений')).toBeTruthy();
  expect(screen.getByRole('link', { name: /карабинный путь/ })).toBeTruthy();
});

test('счётчик показывает «N из M» и сбрасывает фильтры', () => {
  render(<CatalogPage data={data} />);
  const total = data.drills.length;
  expect(screen.getByText(`Найдено ${total} из ${total}`)).toBeTruthy();

  fireEvent.click(screen.getByRole('radio', { name: 'средняя' }));
  expect(screen.queryByText(`Найдено ${total} из ${total}`)).toBeNull();

  fireEvent.click(screen.getByText('сбросить фильтры'));
  expect(screen.getByText(`Найдено ${total} из ${total}`)).toBeTruthy();
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
});

test('тренировка дня: кнопка ведёт на страницу упражнения', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByText('тренировка дня'));
  expect(window.location.hash).toMatch(/^#\/drill\//);
});

test('избранное: звезда сохраняет в localStorage, чип сужает список', () => {
  render(<CatalogPage data={data} />);
  const card = screen.getByText('Билл Дрилл (карабин)').closest('.drill-card') as HTMLElement;
  fireEvent.click(card.querySelector('.drill-card__star') as HTMLElement);
  expect(JSON.parse(window.localStorage.getItem('shooting-favorites-v1') ?? '[]')).toContain(
    'bill-drill-carbine',
  );

  fireEvent.click(screen.getByRole('button', { name: 'избранное' }));
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.queryByText('3-V (USPSA 03-04)')).toBeNull();
});

test('избранное из соседней вкладки не затирается при клике', () => {
  render(<CatalogPage data={data} />);
  // пока каталог открыт, другая вкладка добавила своё избранное
  window.localStorage.setItem('shooting-favorites-v1', JSON.stringify(['one-to-five']));
  const card = screen.getByText('Билл Дрилл (карабин)').closest('.drill-card') as HTMLElement;
  fireEvent.click(card.querySelector('.drill-card__star') as HTMLElement);
  const stored = JSON.parse(window.localStorage.getItem('shooting-favorites-v1') ?? '[]');
  expect(stored).toContain('one-to-five'); // не затёрт
  expect(stored).toContain('bill-drill-carbine');
});

test('пустой результат: «Ничего не найдено» + кнопка «Сбросить» возвращает список', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'квантовая баллистика' } });
  expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  fireEvent.click(screen.getByText('Сбросить'));
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
});

test('длинный список рендерится шагом: 100 карточек + «показать ещё»', () => {
  render(<CatalogPage data={data} />);
  const drillCards = () =>
    document.querySelectorAll('.drill-list .drill-card a[href^="#/drill/"]').length;
  expect(data.drills.length).toBeGreaterThan(100); // предусловие: список длиннее шага
  expect(drillCards()).toBe(100);

  fireEvent.click(screen.getByText(/показать ещё/));
  expect(drillCards()).toBe(200);

  // смена фильтра возвращает шаг, а не тащит старый лимит
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'билл' } });
  const visible = document.querySelectorAll('.drill-list .drill-card a[href^="#/drill/"]').length;
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(100);
  expect(screen.queryByText(/показать ещё/)).toBeNull();
});

test('«патронов до −5» зажимается в ноль, а не ведёт себя как «без фильтра»', () => {
  render(<CatalogPage data={data} />);
  const input = screen.getByLabelText('патронов до') as HTMLInputElement;
  fireEvent.input(input, { target: { value: '-5' } });
  expect(input.value).toBe('0');
});

test('«1e999» (Infinity) в числовых фильтрах сбрасывается в «не задано»', () => {
  render(<CatalogPage data={data} />);
  const rounds = screen.getByLabelText('патронов до') as HTMLInputElement;
  fireEvent.input(rounds, { target: { value: '1e999' } });
  expect(rounds.value).toBe('');
  const dist = screen.getByLabelText(/дистанция до/) as HTMLInputElement;
  fireEvent.input(dist, { target: { value: '1e999' } });
  expect(dist.value).toBe('');
  // фантомный «сбросить фильтры» от Infinity в состоянии — тоже нет
  expect(screen.queryByText('сбросить фильтры')).toBeNull();
});
