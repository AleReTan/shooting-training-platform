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
  expect(screen.getByText('Стена (сухая)')).toBeTruthy();
});

test('поиск фильтрует карточки', () => {
  render(<CatalogPage data={data} />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: '1-to-5' } });
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('фильтр fireMode «сухие» оставляет только dry', () => {
  render(<CatalogPage data={data} />);
  fireEvent.change(screen.getByLabelText('Тип тренировки'), { target: { value: 'dry' } });
  expect(screen.getByText('Стена (сухая)')).toBeTruthy();
  expect(screen.queryByText('От 1 до 5')).toBeNull();
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
