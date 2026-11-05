import { test, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import CatalogPage from './CatalogPage';
import { loadData, type AppData } from '../../data/load';

let data: AppData;
beforeAll(async () => {
  data = await loadData();
});

afterEach(() => {
  cleanup();
  window.location.hash = '';
  window.localStorage.clear();
});

test('каталог показывает упражнения', () => {
  render(<CatalogPage data={data} />);
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.getByText('Стена (холостая)')).toBeTruthy();
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
  expect(screen.getByText('T-Rex: 50 патронов, пистолет')).toBeTruthy();
  expect(screen.queryByText('T-Rex: 50 патронов, карабин')).toBeNull();
});

test('сложность «3+» прячет упражнения легче третьей', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('radio', { name: '3+' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy(); // сложность 3
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull(); // сложность 2
});

test('сложность «до 2» прячет упражнения третьей и выше', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('сложность до'), { target: { value: '2' } });
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy(); // сложность 2
  expect(screen.queryByText('От 1 до 5')).toBeNull(); // сложность 3
});

test('сложность «до 1» оставляет только самые простые', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('сложность до'), { target: { value: '1' } });
  expect(screen.getByText('Стена (холостая)')).toBeTruthy(); // сложность 1
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull(); // сложность 2
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

  fireEvent.click(screen.getByRole('radio', { name: '3+' }));
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
  const card = screen.getByText('От 1 до 5').closest('.drill-card') as HTMLElement;
  fireEvent.click(card.querySelector('.drill-card__star') as HTMLElement);
  expect(JSON.parse(window.localStorage.getItem('shooting-favorites-v1') ?? '[]')).toContain(
    'one-to-five',
  );

  fireEvent.click(screen.getByRole('button', { name: 'избранное' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('избранное из соседней вкладки не затирается при клике', () => {
  render(<CatalogPage data={data} />);
  // пока каталог открыт, другая вкладка добавила своё избранное
  window.localStorage.setItem('shooting-favorites-v1', JSON.stringify(['bill-drill-carbine']));
  const card = screen.getByText('От 1 до 5').closest('.drill-card') as HTMLElement;
  fireEvent.click(card.querySelector('.drill-card__star') as HTMLElement);
  const stored = JSON.parse(window.localStorage.getItem('shooting-favorites-v1') ?? '[]');
  expect(stored).toContain('one-to-five');
  expect(stored).toContain('bill-drill-carbine'); // не затёрт
});

test('пустой результат: «Ничего не найдено» + кнопка «Сбросить» возвращает список', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'квантовая баллистика' } });
  expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  fireEvent.click(screen.getByText('Сбросить'));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
});
