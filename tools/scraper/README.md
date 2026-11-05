# Скрапер shootie.pro (dump-based, MVP)

Импорт упражнений с закрытого раздела `shootie.pro/stages`. Сайт требует логин —
**автоматический обход логина запрещён**: скрипт ничего не скачивает сам, он
парсит только страницы, которые ты сохранил вручную из своего залогиненного
браузера. Теги проставляются вручную при вычитке (Step 6), не автоматически.

## Как собрать дампы

1. Залогинься на shootie.pro в браузере.
2. Открой раздел stages (каталог и/или страницы отдельных этапов).
3. На каждой странице: `Ctrl+S` → «Веб-страница, только HTML» (или «complete»,
   парсер всё равно читает только разметку) → сохрани в папку, например
   `dumps/` в корне репозитория (папка в `.gitignore` — дампы не коммитим).
4. Повтори для всех страниц каталога (пагинация: сохрани каждую).

## Структура карточки этапа

Парсер ищет на странице карточки вида (фиксация по фикстуре
`fixtures/stages-page.html`; при расхождении с реальным дампом — правим
`parse-shootie.ts` и фикстуру вместе):

```html
<article class="stage-card" data-discipline="carbine">
  <h2 class="stage-title"><a href="https://shootie.pro/stages/123">Название</a></h2>
  <div class="stage-author">Автор: Иван Петров</div>
  <ul class="stage-meta">
    <li data-key="targets">4 × IPSC Metric</li>
    <li data-key="distance">10–25 м</li>
    <li data-key="rounds">24 патрона</li>
    <li data-key="scoring">Хит-фактор</li>
  </ul>
  <div class="stage-description">Цель упражнения — …</div>
  <ol class="stage-steps"><li>Шаг 1</li></ol>
</article>
```

Пропускается: не-карабинные дисциплины (`data-discipline` ≠ `carbine` —
уходит в `skipped/*.md` с пометкой), карточки без заголовка, всё вне карточек.

## Запуск

```bash
npm run scrape:shootie -- dumps/
```

- `data/drills/import-shootie-<slug>.json` — по файлу на этап, все с
  `needsReview: true`, `source.origin: 'shootie.pro · <автор>'`, `kind: 'forum'`.
- `tools/scraper/skipped/<slug>.md` — пропущенное с причиной.
- Фоллбеки до вычитки: `tags: []`, `difficulty: 3`, `fireMode: ['live']`,
  нераспознанные мишени → `ipsc-metric`, `goal` из описания после
  «Цель упражнения — » либо имя, `steps` из списка либо описание.

Дальше: `npm run validate:data` (должно быть exit 0) → вычитка: проставить
теги из `data/taxonomy.json`, вычистить форматирование, снять `needsReview`
у проверенных. Пуш после каждого пакета.

## Тесты

```bash
npx vitest run tools/scraper/parse-shootie.test.ts
```
