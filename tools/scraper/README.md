# Скрапер shootie.pro (dump-based, MVP)

Импорт упражнений с закрытого раздела `shootie.pro/stages`. Сайт требует логин —
скрипт ничего не скачивает сам, он парсит сохранённые HTML-страницы этапов.
Теги проставляются вручную при вычитке, не автоматически.

## Формат данных

shootie.pro — Laravel + Inertia: контент страницы лежит JSON-ом в

```html
<script data-page="app" type="application/json">{"component":"Stages/Show","props":{"stage":{…}}}</script>
```

Парсер читает `props.stage`: `title`, `descriptionHtml` (Tiptap HTML → текст),
`sections[]` (если непусты — шаги упражнения, иначе один шаг из описания),
`params` (`shotsCount`, `distance` в метрах, `difficulty`: Лёгкая/Средняя/Сложная
→ 2/3/4), `weaponTypes[]`, `author.name`.

Тип оружия → дисциплина: `rifle` → `carbine`, `pistol` → `pistol-traumatic`,
`shotgun` → `shotgun`. Смешанные этапы (несколько типов оружия) получают
несколько дисциплин сразу и находятся в каждом из фильтров. Без указанного
оружия → `['carbine']`. Неизвестный тип оружия и страницы каталога
(`Stages/Index`) — в `tools/scraper/skipped/*.md` с пометкой.

Все импортированные: `needsReview: true`, `source.origin: 'shootie.pro · <автор>'`,
`kind: 'forum'`, `tags: []`, `scoring: none`, мишени — плейсхолдер `ipsc-metric ×1`
(в источнике нет структурированных мишеней) — всё это закрывается при вычитке.

## Как собрать дампы

Либо руками: залогинься → открой `shootie.pro/stages/<id>` → `Ctrl+S` («только
HTML») в папку `dumps/` (в `.gitignore`).

Либо авторизованным обходом по явной просьбе владельца аккаунта (так была
собрана текущая партия): каталог `?page=N` даёт список карточек, каждая
страница этапа сохраняется как `dumps/stage-<id>.html`. Сессионные куки —
только во временных файлах вне репозитория.

## Запуск

```bash
npm run scrape:shootie -- dumps/
npm run validate:data   # должно быть exit 0
```

Коллизии одинаковых названий получают суффикс `-2/-3`; id = имя файла
(требование валидатора).

## Тесты

```bash
npx vitest run tools/scraper/parse-shootie.test.ts
```

Фикстуры `fixtures/*.html` — минимизированные реальные страницы
(этап / пистолетный этап / страница каталога).
