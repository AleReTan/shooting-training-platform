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

test('фильтр «Тип тренировки»: варианты «огневые» и «холостые»', () => {
  render(<CatalogPage data={data} />);
  const select = screen.getByLabelText('Тип тренировки');
  expect(select.textContent).toContain('огневые');
  expect(select.textContent).toContain('холостые');
  expect(select.textContent).not.toContain('сухие');
  expect(select.textContent).not.toContain('боевые');
});

test('фильтр fireMode «холостые» оставляет только dry', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('Тип тренировки'), { target: { value: 'dry' } });
  expect(screen.getByText('Стена (холостая)')).toBeTruthy();
  expect(screen.queryByText('От 1 до 5')).toBeNull();
});

test('фильтр «Оружие: пистолет» оставляет пистолетные упражнения', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('Оружие'), { target: { value: 'pistol-traumatic' } });
  expect(screen.getByText('T-Rex: 50 патронов, пистолет')).toBeTruthy();
  expect(screen.queryByText('T-Rex: 50 патронов, карабин')).toBeNull();
});

test('чип тега «Первый выстрел» оставляет одно упражнение', () => {
  render(<CatalogPage data={data} />);
  fireEvent.click(screen.getByRole('button', { name: 'Первый выстрел' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('пустой результат: «Ничего не найдено» + кнопка «Сбросить» возвращает список', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'квантовая баллистика' } });
  expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  fireEvent.click(screen.getByText('Сбросить'));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
});
