import { useRoute } from './router';
import { Shell } from './shell';
import CatalogPage from '../features/library/CatalogPage';

export default function App() {
  const { path } = useRoute();
  return (
    <Shell>
      {path === '/' ? (
        <CatalogPage />
      ) : (
        <section>
          <h2>Раздел в разработке</h2>
          <p>
            <a href="#/">← В каталог</a>
          </p>
        </section>
      )}
    </Shell>
  );
}
