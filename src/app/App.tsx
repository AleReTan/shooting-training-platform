import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './router';
import { Shell } from './shell';
import CatalogPage from '../features/library/CatalogPage';
import { DrillPage } from '../features/library/DrillPage';
import { CoursePage } from '../features/library/CoursePage';
import TimerPage from '../features/timer/TimerPage';
import { HitFactorPage } from '../features/calc/HitFactorPage';
import { ConvertersPage } from '../features/calc/ConvertersPage';
import { loadData, type AppData } from '../data/load';

export default function App() {
  const { path, segments } = useRoute();

  // Данные приезжают асинхронным чанком — оболочка красится сразу.
  // loadKey: кнопка «Повторить» после сбоя перезапускает загрузку.
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  useEffect(() => {
    let on = true;
    void loadData()
      .then((d) => {
        if (on) setData(d);
      })
      .catch(() => {
        if (on) setError(true);
      });
    return () => {
      on = false;
    };
  }, [loadKey]);

  if (error) {
    return (
      <Shell>
        <section>
          <h2>Не удалось загрузить данные</h2>
          <p>Проверь соединение и попробуй ещё раз.</p>
          <button
            type="button"
            class="btn btn--primary"
            onClick={() => {
              setError(false);
              setLoadKey((k) => k + 1);
            }}
          >
            Повторить
          </button>
        </section>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <section>
          <p>Загрузка…</p>
        </section>
      </Shell>
    );
  }

  let page = <section>
    <h2>Раздел в разработке</h2>
    <p>
      <a href="#/">← В каталог</a>
    </p>
  </section>;

  if (path === '/') {
    page = <CatalogPage data={data} />;
  } else if (segments[0] === 'drill' && segments[1]) {
    page = <DrillPage id={segments[1]} data={data} />;
  } else if (segments[0] === 'course' && segments[1]) {
    page = <CoursePage id={segments[1]} data={data} />;
  } else if (segments[0] === 'timer') {
    page = <TimerPage />;
  } else if (segments[0] === 'calc') {
    page = <HitFactorPage />;
  } else if (segments[0] === 'conv') {
    page = <ConvertersPage />;
  }

  return <Shell>{page}</Shell>;
}
