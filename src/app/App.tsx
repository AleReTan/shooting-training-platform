import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './router';
import { Shell } from './shell';
import CatalogPage from '../features/library/CatalogPage';
import { DrillPage } from '../features/library/DrillPage';
import { CoursePage } from '../features/library/CoursePage';
import TimerPage from '../features/timer/TimerPage';
import { loadData, type AppData } from '../data/load';

export default function App() {
  const { path, segments } = useRoute();

  // Данные приезжают асинхронным чанком — оболочка красится сразу
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => {
    let on = true;
    void loadData().then((d) => {
      if (on) setData(d);
    });
    return () => {
      on = false;
    };
  }, []);

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
  }

  return <Shell>{page}</Shell>;
}
