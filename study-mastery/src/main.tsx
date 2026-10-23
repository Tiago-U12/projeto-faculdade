import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import 'katex/dist/katex.min.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadBank } from './lib/bank';
import { RadioProvider } from './radio';
import { StudyProvider } from './state';

const root = createRoot(document.getElementById('root')!);
root.render(<p className="boot" role="status">Carregando banco de questões…</p>);

loadBank()
  .then((bank) => {
    root.render(
      <StrictMode>
        <StudyProvider bank={bank}>
          <RadioProvider>
            <App />
          </RadioProvider>
        </StudyProvider>
      </StrictMode>,
    );
  })
  .catch((e) => {
    root.render(<p className="boot" role="alert">Não foi possível carregar o banco de questões: {String(e)}</p>);
  });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
