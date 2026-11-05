import { useRoute } from './router';
import { Shell } from './shell';
import CatalogPage from '../features/library/CatalogPage';
import { DrillPage } from '../features/library/DrillPage';
import { CoursePage } from '../features/library/CoursePage';

export default function App() {
  const { path, segments } = useRoute();

  let page = <section>
    <h2>Раздел в разработке</h2>
    <p>
      <a href="#/">← В каталог</a>
    </p>
  </section>;

  if (path === '/') {
    page = <CatalogPage />;
  } else if (segments[0] === 'drill' && segments[1]) {
    page = <DrillPage id={segments[1]} />;
  } else if (segments[0] === 'course' && segments[1]) {
    page = <CoursePage id={segments[1]} />;
  }

  return <Shell>{page}</Shell>;
}
