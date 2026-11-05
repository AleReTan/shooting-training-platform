import { useEffect, useState } from 'preact/hooks';

export interface RouteMatch {
  path: string;
  segments: string[];
}

/** Текущий путь из хеша URL: '' → '/', '#/drill/x' → '/drill/x'. */
export function currentHashPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash === '' ? '/' : hash;
}

/** Реагирует на hashchange и возвращает текущий маршрут. */
export function useRoute(): RouteMatch {
  const [path, setPath] = useState(currentHashPath);
  useEffect(() => {
    const onHashChange = () => setPath(currentHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return { path, segments: path.split('/').filter(Boolean) };
}

/** Переход по hash-пути. */
export function navigate(path: string): void {
  window.location.hash = path;
}
