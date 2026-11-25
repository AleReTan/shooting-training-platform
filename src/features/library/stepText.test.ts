import { test, expect } from 'vitest';
import { presentStep } from './stepText';

test('серия с местом: заголовок — до двоеточия, действия по «;» — построчно', () => {
  expect(
    presentStep(
      'Серия 5 · 10→25 м: с метки 10 м — 2 в голову левой; отход на левую палку (25 м) — 2 в голову правой',
    ),
  ).toEqual({
    title: 'Серия 5 · 10→25 м',
    lines: ['с метки 10 м — 2 в голову левой', 'отход на левую палку (25 м) — 2 в голову правой'],
  });
});

test('заголовки серий USPSA и короткие подписи («Старт», «Счёт») тоже выносятся', () => {
  expect(presentStep('Серия 1 (4,5 с): 6 выстрелов в T1 только с левого плеча').title).toBe('Серия 1 (4,5 с)');
  expect(presentStep('Серия 2: то же с левой стороны баррикады').title).toBe('Серия 2');
  expect(
    presentStep('Старт: стрелок в боксе A за баррикадой лицом в сторону мишеней; для карабина — ствол касается метки'),
  ).toEqual({
    title: 'Старт',
    lines: ['стрелок в боксе A за баррикадой лицом в сторону мишеней', 'для карабина — ствол касается метки'],
  });
  expect(presentStep('String 1 · 5 m mark: from low ready — 1 round to the head').title).toBe('String 1 · 5 m mark');
});

test('просто текст остаётся как есть: переносы строк не трогаем, двоеточие внутри фразы — не заголовок', () => {
  expect(presentStep('По сигналу — 6 выстрелов в зону «А» на максимальной скорости')).toEqual({
    title: undefined,
    lines: ['По сигналу — 6 выстрелов в зону «А» на максимальной скорости'],
  });
  // импорт с переносами строк — дословно (переносы показывает CSS, white-space: pre-line)
  const imported = 'По сигналу таймера поражается гонг.\r\nОружие: патруль\r\nПатрон: в патроннике';
  expect(presentStep(imported)).toEqual({ title: undefined, lines: [imported] });
  expect(presentStep('Положение №1, субъекты и патроны 1+2: дистанция 5 м').title).toBeUndefined();
  expect(presentStep('Старт в 2:00 по сигналу').title).toBeUndefined();
});
