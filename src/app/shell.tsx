import type { ComponentChildren } from 'preact';

/** Оболочка приложения: шапка с названием и навигацией. */
export function Shell(props: { children: ComponentChildren }) {
  return (
    <>
      <header class="app-header">
        <h1>Стрелковые тренировки</h1>
        <nav>
          <a href="#/">Каталог</a>
          <a href="#/timer">Таймер</a>
        </nav>
      </header>
      <main class="app-main">{props.children}</main>
    </>
  );
}
