import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import CatalogPage from './CatalogPage';

afterEach(cleanup);

test('каталог показывает seed-упражнения', () => {
  render(<CatalogPage />);
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.getByText('Билл Дрилл (карабин)')).toBeTruthy();
  expect(screen.getByText('Стена (сухая)')).toBeTruthy();
});

test('поиск фильтрует карточки', () => {
  render(<CatalogPage />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: '1-to-5' } });
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('фильтр fireMode «сухие» оставляет только dry', () => {
  render(<CatalogPage />);
  fireEvent.change(screen.getByLabelText('Тип тренировки'), { target: { value: 'dry' } });
  expect(screen.getByText('Стена (сухая)')).toBeTruthy();
  expect(screen.queryByText('От 1 до 5')).toBeNull();
});

test('чип тега «Первый выстрел» оставляет одно упражнение', () => {
  render(<CatalogPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Первый выстрел' }));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
  expect(screen.queryByText('Билл Дрилл (карабин)')).toBeNull();
});

test('пустой результат: «Ничего не найдено» + кнопка «Сбросить» возвращает список', () => {
  render(<CatalogPage />);
  fireEvent.input(screen.getByLabelText('Поиск'), { target: { value: 'квантовая баллистика' } });
  expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  fireEvent.click(screen.getByText('Сбросить'));
  expect(screen.getByText('От 1 до 5')).toBeTruthy();
});
