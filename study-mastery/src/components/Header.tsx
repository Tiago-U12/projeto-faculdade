import { BookOpen, Moon, Sun } from 'lucide-react';
import { useStudy } from '../state';
import type { Route } from '../lib/route';
import { RadioPlayer } from './RadioPlayer';

export function Header({ route, go }: { route: Route; go: (to: string) => void }) {
  const { state, updateSettings } = useStudy();
  const theme = state.settings.theme;
  const dark = theme === 'dark' || (theme === 'auto' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const nav = (to: string, name: Route['name'], label: string, icon: React.ReactNode) => (
    <button type="button" className={'icon-btn' + (route.name === name ? ' active' : '')} onClick={() => go(to)} aria-label={label} title={label} aria-current={route.name === name ? 'page' : undefined}>
      {icon}
    </button>
  );
  return (
    <header className="top">
      <button type="button" className="brand" onClick={() => go('#/')} aria-label="Study Mastery — início">
        <span className="star" aria-hidden="true">✳</span>
        <span className="brand-text">STUDY<span>MASTERY</span></span>
      </button>
      <nav className="top-actions" aria-label="Principal">
        <RadioPlayer />
        {nav('#/library', 'library', 'Acervo e fontes', <BookOpen size={19} />)}
        <button type="button" className="icon-btn" onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title="Alternar tema">
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </nav>
    </header>
  );
}
