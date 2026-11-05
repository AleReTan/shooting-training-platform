import { test, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import CatalogPage from './CatalogPage';
import { loadData, type AppData } from '../../data/load';

let data: AppData;
beforeAll(async () => {
  data = await loadData();
});

afterEach(cleanup);

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
  const group = screen.getByRole('group', { name: 'тип тренировки' });
  expect(group.textContent).toContain('огневые');
  expect(group.textContent).toContain('холостые');
  expect(group.textContent).not.toContain('сухие');
  expect(group.textContent).not.toContain('боевые');
});

test('фильтр fireMode «холостые» оставляет только dry', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('button', { name: 'холостые' }));
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
  fireEvent.click(screen.getByRole('button', { name: '3+' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy(); // сложность 3
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull(); // сложность 2
});

test('сложность «до 2» прячет упражнения третьей и выше', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('сложность до'), { target: { value: '2' } });
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy(); // сложность 2
  expect(screen.queryByText('От 1 до 5')).toBeNull(); // сложность 3
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

  fireEvent.click(screen.getByRole('button', { name: '3+' }));
  expect(screen.queryByText(`Найдено ${total} из ${total}`)).toBeNull();

  fireEvent.click(screen.getByText('сбросить фильтры'));
  expect(screen.getByText(`Найдено ${total} из ${total}`)).toBeTruthy();
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
});

test('пустой результат: «Ничего не найдено» + кнопка «Сбросить» возвращает список', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'квантовая баллистика' } });
  expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  fireEvent.click(screen.getByText('Сбросить'));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
});
