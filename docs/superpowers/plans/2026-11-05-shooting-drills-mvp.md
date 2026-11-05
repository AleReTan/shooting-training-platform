# Библиотека стрелковых упражнений (MVP) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Офлайн-PWA справочник 100+ реальных карабинных упражнений с тегами, SVG-схемами мишенной обстановки с анимацией, курсами и таймером.

**Architecture:** SPA на Vite+Preact+TS; контент — JSON-файлы в `data/`, валидируются CI; хостинг GitHub Pages без бэкенда; офлайн через Workbox precache. Модули `src/features/*` изолированы, общее — `src/app`, `src/ui`, `src/data`.

**Tech Stack:** Vite, Preact, TypeScript (strict), Vitest + @testing-library/preact, vite-plugin-pwa (Workbox), GitHub Actions. Node ≥ 20, npm.

**Spec:** `docs/superpowers/specs/2026-11-05-shooting-drills-pwa-design.md` — план реализует её MVP (§8); исполнители читают спеку вместе с задачей.

## Global Constraints

- Русский язык интерфейса и текстов; EN — только fallback-поля данных (`ru` первичен).
- Единицы: метры и секунды; `unit` всегда `'m'`.
- **Только реальные, проверенные упражнения.** Свои тексты. Обязательна атрибуция `source.origin`. Если подлинность упражнения/источник подтвердить не удаётся — не добавлять. Выдумывать запрещено.
- MVP: `discipline` всегда `["carbine"]`.
- Один JSON-файл на упражнение: `data/drills/<id>.json`, `id` = kebab-case = имя файла.
- Preact, не React. TS strict. First-load JS < 50 КБ gzip.
- Роутинг hash (`#/…`) — SPA на GitHub Pages без 404-fallback.
- Медиа НЕ входят в precache (зарезервирован RuntimeCaching `/media/**`); в MVP медиафайлов нет.
- Внешние YouTube-ссылки — только ссылками, не встроками (спека §7, доступ из РФ).
- Коммит после каждой задачи (шаги «Commit» внутри задач).

## Review Focus

1. **Пустой результат фильтров/поиска** → «Ничего не найдено» + кнопка сброса, не пустой экран. Тест в Task 6.
2. **Кривые данные**: тег вне таксономии, битый `related`, `sequence` ссылается на несуществующую мишень/позицию, координаты вне `width/depth` → валидатор ловит всё, CI красный. Тесты в Task 3.
3. **Телефон заблокирован/таба в фоне** во время случайной задержки таймера → время по `Date.now()`, не по подсчёту тиков. Тест с fake-временем в Task 11.
4. **Живой старый Service Worker при новом деплое** → детект новой версии и предложение обновиться. Тест логики `needsRefresh` в Task 12.
5. **`prefers-reduced-motion`** → статичная схема + пошаговый режим вместо анимации. Тест в Task 8.

---

### Task 1: Каркас проекта

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/app/main.tsx`, `src/app/App.tsx`, `.gitignore`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: собираемый проект; скрипты `dev`, `build`, `test`, `validate:data` (validate:data появится в Task 3, в ci.yml указать сразу); CI на PR/push: install → validate → test → build.

- [ ] **Step 1: Scaffold.** `npm create vite@latest . -- --template preact-ts` в корне (файлы спеки/плана не трогать), либо вручную по шаблону. Добавить `vitest`, `jsdom`, `@testing-library/preact` (dev). В `vite.config.ts`: base `./`, alias `@` → `src`.
- [ ] **Step 2: Минимальное приложение.** `App.tsx` рендерит `<h1>Стрелковые тренировки</h1>`; hash-роутер: пакет `preact-router`, `HashHistory`.
- [ ] **Step 3: Smoke-тест.** Тест `src/app/App.test.tsx`: рендер `App` содержит заголовок. Run: `npm test` — PASS.
- [ ] **Step 4: CI.** `.github/workflows/ci.yml`: node 20, `npm ci && npm run validate:data && npm test && npm run build` (validate:data — заглушка `exit 0` в package.json до Task 3). Push — CI зелёный.
- [ ] **Step 5: Commit** — `chore: каркас Vite+Preact+TS+Vitest, CI`.

### Task 2: Типы данных, таксономия, seed-данные

**Files:**
- Create: `src/data/types.ts`, `data/taxonomy.json`, `data/sources.json`, `data/drills/seed-bill-drill-carbine.json`, `data/drills/seed-1-to-5.json`, `data/drills/seed-wall-dry.json`, `data/courses/seed-trex-intro.json`

**Interfaces:**
- Produces (используют все последующие задачи): типы `Drill`, `Course`, `Taxonomy`, `Layout`, `SequenceStep` и пр. — точно по спеке §4, §4.1, §5, §7: `type Localized = { ru: string; en?: string }`; `type SequenceStep = { action: 'engage'; target: string; shots: number } | { action: 'move'; from: string; to: string } | { action: 'reload' }`; `interface Layout { unit: 'm'; width: number; depth: number; positions: { id: string; x: number; y: number; label?: Localized }[]; targets: { id: string; x: number; y: number; type: string }[]; barriers?: { x: number; y: number; kind: string }[]; movement?: { from: string; to: string; style: 'advance' | 'retreat' | 'lateral' }[]; sequence?: SequenceStep[] }`. `sequence` живёт внутри `layout` (спека §7).
- Produces: `data/taxonomy.json` — все теги спеки §6: навыки `first-shot, reload, reload-tactical, reload-emergency, transitions, movement, movement-forward, movement-retreat, movement-lateral, precision-long, recoil-control, positions, standing, kneeling, prone, barricade, bilateral, cover, speed, accuracy`; условия `nvg, armor, helmet, stress`; `targetTypes`: `ipsc-metric, ipsc-classic, steel-circle, steel-popper, a4-paper`; `parLevels`: `novice, intermediate, advanced, master`.
- Seed-файлы: три валидных упражнения разной формы (Bill Drill-карабин с `layout.sequence` из спеки §7; 1-to-5 без layout; Wall Drill c `fireMode:["dry"]`) + один seed-курс из 2 упражнений.

- [ ] **Step 1:** Написать `types.ts` (строго по спеке, без лишних полей).
- [ ] **Step 2:** Написать `taxonomy.json`, `sources.json` (реестр origin-строк: Kyle Lamb, USPSA, Steel Challenge, T-Rex Arms, «карабинная адаптация»…), seed-файлы.
- [ ] **Step 3: Проверка.** `npx tsc --noEmit` — PASS; JSON парсятся (`node -e` цикл по файлам).
- [ ] **Step 4: Commit** — `feat: типы данных, таксономия, seed-данные`.

### Task 3: Валидатор данных + CLI

**Files:**
- Create: `tools/validate-data/validate.ts`, `tools/validate-data/cli.ts`
- Modify: `package.json` (скрипт `validate:data` = `tsx tools/validate-data/cli.ts`; dev-dep `tsx`)

**Interfaces:**
- Consumes: типы Task 2.
- Produces: `validateAll(drills: unknown[], courses: unknown[], taxonomy: Taxonomy): { ok: boolean; errors: string[] }` — чистая функция; CLI читает `data/**`, печатает ошибки, exit code 1 при `!ok`.

- [ ] **Step 1: Failing-тесты** `tools/validate-data/validate.test.ts` — случаи: валидный seed → ok; дубль `id`; тег вне таксономии; имя файла ≠ id; пустые `name.ru/steps.ru/goal.ru/source.origin`; `related` на несуществующий id; `unit !== 'm'`; `scoring.type='hit-factor'` без `points`; `discipline` ≠ `['carbine']`; `difficulty` вне 1–5; у курса: `drillId` не существует, пустой `items`, дубль `order`; `layout.sequence` ссылается на target/position, которых нет в `layout`; координаты вне `width/depth`; `distance.min > distance.max`.
- [ ] **Step 2:** `npm test` — все новые FAIL.
- [ ] **Step 3:** Реализовать `validate.ts` (простые императивные проверки, без библиотек схем).
- [ ] **Step 4:** `npm test` PASS; `npm run validate:data` на seed — exit 0.
- [ ] **Step 5: Commit** — `feat: валидатор данных + CLI (validate:data)`.

### Task 4: Слой данных приложения

**Files:**
- Create: `src/data/load.ts`, `src/app/i18n.ts`
- Test: `src/data/load.test.ts`

**Interfaces:**
- Consumes: типы и JSON Task 2 (`import.meta.glob('/data/drills/*.json', { eager: true })` и аналогично courses/taxonomy).
- Produces: `interface AppData { drills: Drill[]; drillById: Map<string, Drill>; courses: Course[]; courseById: Map<string, Course>; coursesByDrillId: Map<string, Course[]>; taxonomy: Taxonomy }`; `loadData(): AppData` (модуль-синглтон); `localized(field?: Localized): string` (ru → en → ''); `localizedList(field?: { ru: string[]; en?: string[] }): string[]`.

- [ ] **Step 1: Failing-тест:** `loadData()` находит seed-данные; `coursesByDrillId.get('seed-bill-drill-carbine')` содержит seed-курс; `localized({ en: 'X' })` → `'X'`.
- [ ] **Step 2 → FAIL; Step 3:** реализовать `load.ts` + `i18n.ts`; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: слой данных, индексы, i18n-fallback`.

### Task 5: Фильтры и поиск каталога

**Files:**
- Create: `src/features/library/filters.ts`
- Test: `src/features/library/filters.test.ts`

**Interfaces:**
- Consumes: `Drill` (Task 2).
- Produces: `interface CatalogFilters { query: string; tags: string[]; difficultyMin?: number; difficultyMax?: number; fireMode?: 'live' | 'dry'; maxRounds?: number; distanceMax?: number }`; `filterDrills(drills: Drill[], f: CatalogFilters): Drill[]`. Семантика: все заполненные поля сужают (AND); внутри `tags` — OR (хотя бы один выбранный); `query` — без учёта регистра по `name.ru/en`, `goal.ru`, текстам `steps.ru`; `distanceMax` сравнивается с `distance.min` упражнения (влезает, если ближняя граница ≤ порога).

- [ ] **Step 1: Failing-тесты:** фильтр по одному тегу; OR внутри тегов; AND тег+fireMode; query по имени и по тексту шага; maxRounds; distanceMax; пустые фильтры → всё.
- [ ] **Step 2 → FAIL; Step 3:** реализовать чистыми функциями; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: логика фильтров каталога`.

### Task 6: UI каталога

**Files:**
- Create: `src/features/library/CatalogPage.tsx`, `src/features/library/DrillCard.tsx`, `src/ui/TagChip.tsx`, `src/app/shell.tsx` (навигация)
- Modify: `src/app/App.tsx` (роут `#/`)
- Test: `src/features/library/CatalogPage.test.tsx`

**Interfaces:**
- Consumes: `loadData()`, `filterDrills` (Tasks 4–5).
- Produces: `CatalogPage` — список карточек (`DrillCard`: имя, теги-чипы, сложность, дистанция, расход), строка поиска, чекбоксы/чипы тегов сгруппированы «Навыки» / «Условия» (из taxonomy `group`), фильтры сложность/fireMode/патроны/дистанция. URL-хеш фильтров не нужен (MVP).

- [ ] **Step 1: Failing-тест:** поиск «1-to-5» → карточка с русским именем; выбрать тег `dry` → только dry; **пустой результат → «Ничего не найдено» + кнопка «Сбросить»** (Review Focus 1).
- [ ] **Step 2 → FAIL; Step 3:** реализовать компоненты (тексты RU, `<html lang="ru">`); **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: каталог с фильтрами и поиском`.

### Task 7: SVG-схема мишенной обстановки

**Files:**
- Create: `src/app/diagram/render.tsx`
- Test: `src/app/diagram/render.test.tsx`

**Interfaces:**
- Consumes: `Layout` (Task 2).
- Produces: `function LayoutDiagram(props: { layout: Layout; playback?: PlaybackState; reducedMotion?: boolean }): VNode` — чистый компонент: рамка `width×depth` (масштаб в viewBox), позиции (маркер стрелка + id), мишени (иконка по `targetTypes`, id, подпись типа), барьеры, стрелки `movement`, подписи дистанций от позиций до мишеней (евклидово по координатам, метры). `playback` подсвечивает активную мишень/перемещение (тип из Task 8 — пишется здесь как `import type` из его файла, который появится в Task 8: пока `any`-заглушка запрещена TS strict → определить минимальный тип `PlaybackState` в `src/app/diagram/types.ts` здесь, Task 8 импортирует и расширяет).
- Produces: `src/app/diagram/types.ts`: `interface PlaybackState { phase: 'idle' | 'playing' | 'done'; activeTarget?: string; activeMove?: { from: string; to: string; progress: number }; reloading: boolean; shotsDone: Record<string, number> }`.

- [ ] **Step 1: Failing-тесты:** схема seed-упражнения содержит `svg`, тексты `P1/T1`, количество мишеней = `layout.targets.length`; дистанция в подписи равна расчётной (снапшот с фиксированными числами); барьер/движение рендерятся.
- [ ] **Step 2 → FAIL; Step 3:** реализовать (чистая геометрия, без библиотек); **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: SVG-схема мишенной обстановки`.

### Task 8: Проигрыватель sequence

**Files:**
- Create: `src/app/diagram/sequencePlayer.ts`
- Test: `src/app/diagram/sequencePlayer.test.ts`

**Interfaces:**
- Consumes: `SequenceStep`, `PlaybackState` (Tasks 2, 7).
- Produces: `const STEP_DURATIONS = { engagePerShot: 400, engageBase: 1200, move: 1800, reload: 2200 }` (мс); `function computeTimeline(sequence: SequenceStep[]): { steps: { step: SequenceStep; start: number; duration: number }[]; total: number }`; `function stateAt(timeline, t: number): PlaybackState` (для `move` — линейный `progress` 0–1; `engage` накапливает `shotsDone[target]`); `function stepStates(timeline): PlaybackState[]` — по одному состоянию на шаг (пошаговый режим). Компонент-обёртка `SequencePlayer.tsx`: кнопки Play/Pause/Стоп/Шаг вперёд, `requestAnimationFrame` по `performance.now()`, при `matchMedia('(prefers-reduced-motion: reduce)')` — без автопроигрывания, только кнопки «Шаг» (Review Focus 5).

- [ ] **Step 1: Failing-тесты:** таймлайн двух engage+move+reload — старты/длительности арифметически верны; `stateAt(total/2)` — активная мишень правильная; `stateAt` за пределами → `phase:'done'`; `stepStates` length = числу шагов; reduced-motion — флаг `canAutoplay=false`.
- [ ] **Step 2 → FAIL; Step 3:** реализовать чистыми функциями; обёртка — тонкая; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: проигрыватель sequence (таймлайн, пошагово, reduced-motion)`.

### Task 9: Карточка упражнения

**Files:**
- Create: `src/features/library/DrillPage.tsx`
- Modify: `src/app/App.tsx` (роут `#/drill/:id`)
- Test: `src/features/library/DrillPage.test.tsx`

**Interfaces:**
- Consumes: `loadData`, `localized/localizedList`, `LayoutDiagram`, `SequencePlayer`, `TimerPanel` (Task 11 — подключается там; здесь секция-слот с комментарием, чтобы задача была независимой: временно без таймера, Task 11 допишет).
- Produces: `DrillPage({ id })`: имя (+en), источник (origin + ссылка), теги, сложность, fireMode, патроны, дистанция, мишени, пар-таймы таблицей, цель, шаги (нумерованные), ТБ, снаряжение, варианты, «Похожие» (ссылки), «Входит в курсы» (из `coursesByDrillId`), схема + плеер (если `layout`), медиа-ссылки (если есть). Несуществующий id → «Упражнение не найдено» + ссылка в каталог.

- [ ] **Step 1: Failing-тест:** seed Bill Drill — русское имя, шаги списком, «Входит в курсы» содержит seed-курс, SVG присутствует; несуществующий id → not-found.
- [ ] **Step 2 → FAIL; Step 3:** реализовать; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: карточка упражнения`.

### Task 10: Страница курса

**Files:**
- Create: `src/features/library/CoursePage.tsx`
- Modify: `src/app/App.tsx` (роут `#/course/:id`), `CatalogPage.tsx` (секция «Курсы» под фильтрами — список курсов)
- Test: `src/features/library/CoursePage.test.tsx`

**Interfaces:**
- Consumes: `loadData`, роут DrillPage.
- Produces: `CoursePage({ id })`: имя, источник, описание, фазы `structure` заголовками (или один список), упорядоченные `items` со ссылками `#/drill/:id` и заметками; несуществующий id → not-found.

- [ ] **Step 1: Failing-тест:** seed-курс — элементы в порядке `order`, ссылки на 2 упражнения, имя фазы отображается.
- [ ] **Step 2 → FAIL; Step 3:** реализовать; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: страница курса + секция курсов в каталоге`.

### Task 11: Таймер

**Files:**
- Create: `src/features/timer/timerEngine.ts`, `src/features/timer/beep.ts`, `src/features/timer/TimerPanel.tsx`, `src/features/timer/TimerPage.tsx`
- Modify: `src/app/App.tsx` (роут `#/timer`), `src/features/library/DrillPage.tsx` (встроить `TimerPanel` с `parTimes` упражнения)
- Test: `src/features/timer/timerEngine.test.ts`

**Interfaces:**
- Produces: `type TimerState = { phase: 'idle' | 'delay' | 'running' | 'par' | 'stopped'; startedAt?: number; parAt?: number; elapsed: number }`; `type TimerEvent = { type: 'start'; parMs?: number; now: number } | { type: 'stop'; now: number } | { type: 'tick'; now: number }`; `function timerReducer(state: TimerState, ev: TimerEvent, rand: () => number = Math.random): TimerState` — задержка старта `1000 + rand() * 2000` мс, `elapsed` строго из `now - startedAt` (Review Focus 3); `beep(kind: 'start' | 'par' | 'stop'): void` — Web Audio осциллятор (1200 Гц старт / 2400 Гц пар, 150 мс); `TimerPanel({ parTimes?: ParTime[] })` — большие кнопки Старт/Стоп, выбор пар-тайма (из упражнения или вручную), показ фазы и секунд, `navigator.wakeLock` на старте (release на стопе, try/catch — не везде доступен).

- [ ] **Step 1: Failing-тесты:** start→tick до конца задержки → `phase:'running'`, elapsed = разность `now` (в т.ч. «прыжок» времени на 10 с — как блокировка экрана); с `parMs` на `parAt` → `par`; stop из любой фазы → `stopped`; инъекция `rand()` фиксирует длительность задержки.
- [ ] **Step 2 → FAIL; Step 3:** реализовать reducer чистым; beep/UI тонкие обёртки; **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: таймер (бип, пар-тайм, задержка, Wake Lock)`.

### Task 12: PWA — офлайн, иконки, обновление

**Files:**
- Create: `tools/make-icons.mjs`, `public/icons/*` (192/512 PNG, apple-touch 180, favicon.svg), `public/manifest.webmanifest`, `src/app/pwa.ts`, `src/ui/UpdateToast.tsx`
- Modify: `vite.config.ts` (vite-plugin-pwa), `src/app/main.tsx` (регистрация SW)

**Interfaces:**
- Consumes: сборка Task 1.
- Produces: `vite-plugin-pwa` `GenerateSW`: `navigateFallback: 'index.html'`, precache ассетов и JSON данных, `runtimeCaching` для `/media/**` (CacheFirst, `media-cache-v1`) — маршрут зарезервирован, файлов нет; `manifest`: имя «Стрелковые тренировки», `lang: ru`, standalone, иконки; автообновление: колбэк `onNeedRefresh` → `UpdateToast` «Доступна новая версия — Обновить» (Review Focus 4: юнит-тест логики видимости тоста `shouldShowUpdate(regWaiting: boolean)`).

- [ ] **Step 1: Иконки.** dev-dep `sharp`; `tools/make-icons.mjs` — простой круг-мишень на прозрачном фоне (SVG-строка → PNG 192/512/180) + сохранить favicon.svg. Запустить один раз, файлы закоммитить, `sharp` оставить в devDeps.
- [ ] **Step 2: Failing-тест** `shouldShowUpdate`; **Step 3:** pwa.ts + UpdateToast; **Step 4:** PASS.
- [ ] **Step 5: Проверка сборки.** `npm run build` — в `dist` есть `sw.js` с precache-манифестом (grep по `precache`), `manifest.webmanifest`. Ручкой: `npm run preview`, DevTools → Offline → перезагрузка страницы работает.
- [ ] **Step 6: Commit** — `feat: PWA — precache, манифест, иконки, обновление`.

### Task 13: Деплой на GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/ci.yml` (если нужен порядок)

**Interfaces:**
- Consumes: CI Task 1, сборка Task 12.

- [ ] **Step 1:** `deploy.yml`: на push в `main` — validate → test → build → `actions/upload-pages-artifact` (каталог `dist`) → `actions/deploy-pages`. Папку `docs` из артефакта не исключать (не попадает в dist — проверяется сборкой).
- [ ] **Step 2: Проверка.** Залить в созданный пользователем GitHub-репозиторий (пользователь создаёт репо и включает Pages → Source: GitHub Actions), пуш в `main`, зелёный workflow, сайт открывается, hash-роуты работают при прямом открытии `#/drill/…`.
- [ ] **Step 3: Commit** — `ci: деплой на GitHub Pages`.

### Task 14: Контент, партия A — база (~40 упражнений)

**Files:**
- Create: `data/drills/*.json` (~40)

**Interfaces:**
- Consumes: схема Task 2, валидатор Task 3, таксономия.
- Правила контента (спека §1, §9): только реальные упражнения; сомневаешься в источнике — не добавляй; адаптации пистолетной классики под карабин помечать `kind: 'adaptation'`; RU-тексты своими словами; `source.origin` обязателен; `layout` + `sequence` — где порядок известен (стремиться к 100%).
- Ядро партии (проверяемые锚-имена; по каждому исполнитель находит подтверждение параметров): Wall Drill, Ready-Up Standards, 1-to-5 (Kyle Lamb), Bill Drill (адаптация), El Presidente (адаптация), Failure/Mozambique 2+1 (адаптация), Box Drill, Transition Ladder, The Test 10-10-10 (адаптация), 5×5, Dot Torture (адаптация, dry), 5-50-5, перезарядочные одиночные (tactical/emergency на пар-тайм), позиционные (стоя/колено/лёжа по одиночной мишени), двусторонние (смена плеча на пар-тайм), USPSA-классифайерные короткие курсы как одиночные упражнения (`kind: 'uspsa-classifier'`, origin: номер классифайера).
- Теги-покрытие партии: `first-shot, reload, reload-tactical, reload-emergency, positions, standing, kneeling, prone, bilateral, accuracy, speed, recoil-control, transitions` — каждый ≥ 3 упражнений.

- [ ] **Step 1:** Наполнить файлы (по ~10 за коммит).
- [ ] **Step 2: Проверка.** `npm run validate:data` — exit 0; `ls data/drills/*.json | wc -l` ≥ 40 (включая seed); быстрый глазом SMOKE: 3 случайные карточки открываются в dev.
- [ ] **Step 3: Commits** — `content: партия A — базовые упражнения (N шт.)`.

### Task 15: Контент, партия B — динамика и стресс (~40)

**Files:**
- Create: `data/drills/*.json` (~40)

**Interfaces:** как в Task 14. Ядро: стрельба в движении вперёд/назад/бок (в т.ч. адаптации USPSA-этапов и 3-Gun-стандартов), перенос огня на 3+ мишенях, Steel Challenge — все 8 официальных упражнений (`kind: 'steel-challenge'`: Pendulum, Smoke & Hope, Five to Go, Showdown, Speed Option, Outer Limits, Accelerator, Roundabout — карабин-дивизион), стресс-упражнения: спринт/бёрпи между подходами с последующей стрельбой на пульсе (тег `stress`; параметры из публичных тактических/армейских программ с атрибуцией).
- Теги-покрытие: `movement, movement-forward, movement-retreat, movement-lateral, transitions, stress, speed, cover` — каждый ≥ 3.

- [ ] **Step 1: Наполнение. Step 2: Проверка** как в Task 14 (итого ≥ 80). **Step 3: Commit(s).**

### Task 16: Контент, партия C — тактика + курс T-Rex Arms (~25 + курсы)

**Files:**
- Create: `data/drills/*.json` (~25), `data/courses/trex-carbine.json` (+ при желании второй курс), удаление seed-файлов (`seed-*` вливаются в основные id)

**Interfaces:** как в Task 14. Ядро: упражнения под ПНВ (`nvg`), в броне/шлеме (`armor`/`helmet`; источники — публичные тактические программы), дальние точные 100 м+ (`precision-long`), остатки USPSA-адаптаций. **Курс T-Rex Arms:** исполнитель веб-поиском проверяет их публичные тренировочные видео; каждый drill курса существует в `data/drills/`, `source.url` — конкретное видео/статья; параметры (дистанции/пар-таймы) берутся из их материалов, тексты свои; `source.origin: 'T-Rex Arms'`, `kind: 'course'` у курса.
- Теги-покрытие: `nvg, armor, helmet, precision-long` — каждый ≥ 2.

- [ ] **Step 1:** Наполнение drills; **Step 2:** курс(ы); **Step 3: Проверка.** `npm run validate:data` exit 0; всего упражнений ≥ 100; в каталоге фильтры «под ПНВ» и «на пульсе» непустые; курс открывается по роуту.
- [ ] **Step 4: Commit** — `content: партия C + курсы T-Rex Arms; итого N упражнений`.

### Task 17: Скрапер shootie.pro (dump-based, MVP)

**Files:**
- Create: `tools/scraper/parse-shootie.ts`, `tools/scraper/README.md`, `data/drills/import-shootie-*.json` (выход)
- Modify: `package.json` (скрипт `scrape:shootie`)

**Interfaces:**
- Consumes: схема Task 2, валидатор Task 3.
- Produces: CLI `npm run scrape:shootie -- <dumps-dir>`: читает сохранённые пользователем страницы shootie.pro/stages (HTML или HAR из залогиненного браузера пользователя — автоматический обход логина запрещён), извлекает упражнения: имя, описание/шаги, мишени, дистанции, расход, скоринг/хитфактор. Выход: JSON нашей схемы с `needsReview: true`, `source: { origin: 'shootie.pro', kind: 'forum', url: <ссылка упражнения, если есть в дампе> }`, автор оригинала — в `origin` через « · » если указан. Теги расставляются вручную при вычитке (не автоматически), discipline — по разделу источника, карабинные идут в базу, прочие — в `tools/scraper/skipped/` с пометкой.

- [ ] **Step 1: Failing-тест** `tools/scraper/parse-shootie.test.ts` на фикстуре-фрагменте HTML страницы этапа (взять у пользователя один дамп или зафиксировать структуру по нему): парсинг одного этапа → объект схемы; мусорные/пустые блоки пропускаются.
- [ ] **Step 2 → FAIL; Step 3:** реализовать парсер (regex/DOM-парсер на выбор исполнителя, зависимостей минимум); **Step 4:** PASS на фикстуре.
- [ ] **Step 5: Реальный прогон.** Пользователь сохраняет страницы раздела stages (инструкция в `tools/scraper/README.md`: залогиниться → сохранить каждую страницу каталога как complete HTML в папку) → `npm run scrape:shootie -- dumps/` → JSON в `data/drills/` с `needsReview: true`; `npm run validate:data` exit 0.
- [ ] **Step 6: Вычитка.** Совместно с пользователем: проставить теги, вычистить форматирование, снять `needsReview` у проверенных. Пуш после каждого пакета.
- [ ] **Step 7: Commit** — `feat: скрапер shootie.pro + импорт N упражнений (needsReview)`.
