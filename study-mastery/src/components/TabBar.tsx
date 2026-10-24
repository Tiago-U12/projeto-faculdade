import { BarChart3, CalendarDays, Home, NotebookTabs, UserRound } from 'lucide-react';
import type { Route } from '../lib/route';
import { useAccount } from '../account';

const TABS: { to: string; names: Route['name'][]; label: string; icon: React.ReactNode }[] = [
  { to: '#/', names: ['home', 'results', 'library', 'help'], label: 'Início', icon: <Home size={20} aria-hidden="true" /> },
  { to: '#/disciplinas', names: ['disciplines', 'discipline', 'materialNew', 'material', 'questions', 'guideNew', 'guide'], label: 'Disciplinas', icon: <NotebookTabs size={20} aria-hidden="true" /> },
  { to: '#/agenda', names: ['calendar', 'event', 'eventNew', 'eventEdit', 'planner'], label: 'Agenda', icon: <CalendarDays size={20} aria-hidden="true" /> },
  { to: '#/progress', names: ['progress'], label: 'Progresso', icon: <BarChart3 size={20} aria-hidden="true" /> },
  { to: '#/conta', names: ['account', 'privacy'], label: 'Conta', icon: <UserRound size={20} aria-hidden="true" /> },
];

/** Navegação principal fixa embaixo (ícone + nome). Some durante o quiz. */
export function TabBar({ route, go }: { route: Route; go: (to: string) => void }) {
  const { status } = useAccount();
  // no quiz a tela é só da questão; na configuração a barra fica acima do botão "Iniciar sessão"
  if (route.name === 'quiz') return null;
  return (
    <nav className="tabbar" aria-label="Seções">
      {TABS.map((t) => {
        const on = t.names.includes(route.name);
        return (
          <button key={t.to} type="button" className={'tab' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined} onClick={() => go(t.to)}>
            {t.icon}
            <span>{t.label}</span>
            {t.to === '#/conta' && status === 'signedIn' && <i className="tab-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}
