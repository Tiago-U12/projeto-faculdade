import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import 'katex/dist/katex.min.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadBank } from './lib/bank';
import { AccountProvider } from './account';
import { RadioProvider } from './radio';
import { SpaceRoot } from './space';

const root = createRoot(document.getElementById('root')!);
root.render(<p className="boot" role="status">Carregando banco de questões…</p>);

loadBank()
  .then((bank) => {
    root.render(
      <StrictMode>
        <AccountProvider>
          <RadioProvider>
            <SpaceRoot bank={bank}>
              <App />
            </SpaceRoot>
          </RadioProvider>
        </AccountProvider>
      </StrictMode>,
    );
  })
  .catch((e) => {
    (window.__smErrors ??= []).push('banco de questões: ' + String(e));
    root.render(<p className="boot" role="alert">Não foi possível carregar o banco de questões: {String(e)}</p>);
    window.__smBootHelp?.();
  });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
