import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import App from './App';
import { UpdateToast } from '../ui/UpdateToast';
import { registerServiceWorker } from './sw';
import './app.css';

function Root() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    registerServiceWorker((apply) => setApplyUpdate(() => apply));
  }, []);

  return (
    <>
      <App />
      <UpdateToast visible={applyUpdate !== null} onUpdate={() => applyUpdate?.()} />
    </>
  );
}

const root = document.getElementById('app');
if (root) render(<Root />, root);
