import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Help } from './components/Help';
import { Feedback } from './components/Feedback';
import { FeedbackAdmin } from './components/FeedbackAdmin';
import { Account } from './components/Account';
import { Disciplines } from './components/Disciplines';
import { DisciplinePage } from './components/DisciplinePage';
import { MaterialNew } from './components/MaterialNew';
import { MaterialPage } from './components/MaterialPage';
import { QuestionsPage } from './components/Questions';
import { GuideNew, GuidePage } from './components/Guides';
import { Calendar } from './components/Calendar';
import { EventForm, EventPage } from './components/EventPage';
import { Planner } from './components/Planner';
import { Privacy } from './components/Privacy';
import { EVENT_TYPES, type EventType } from './personal/types';
import { TabBar } from './components/TabBar';
import { Home } from './components/Home';
import { Library } from './components/Library';
import { Progress } from './components/Progress';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { Setup } from './components/Setup';
import { useHashRoute } from './lib/route';
import { useStudy } from './state';

export function App() {
  const [route, go] = useHashRoute();
  const { state } = useStudy();
  const theme = state.settings.theme;
  useEffect(() => {
    // o app abriu: a ajuda de inicialização do index.html não deve mais aparecer
    window.__smBooted = true;
    document.getElementById('boot-help')?.setAttribute('hidden', '');
  }, []);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app">
      {/* o app usa rotas por hash: seguir href="#main" trocaria a tela (e tiraria o estudante do quiz) — só move o foco */}
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <Header route={route} go={go} />
      <main id="main" className="container" tabIndex={-1}>
        <ErrorBoundary key={route.name}>
        {route.name === 'home' && <Home go={go} />}
        {route.name === 'setup' && <Setup key={`${route.disciplineId}-${route.preset}-${route.topics?.join()}-${route.mode}`} route={route} go={go} />}
        {route.name === 'quiz' && <Quiz go={go} />}
        {route.name === 'results' && <Results attemptId={route.id} go={go} />}
        {route.name === 'progress' && <Progress go={go} />}
        {route.name === 'library' && <Library go={go} />}
        {route.name === 'help' && <Help go={go} />}
        {route.name === 'feedback' && <Feedback key={`${route.questionId ?? ''}-${route.questionVersion ?? ''}`} go={go} questionId={route.questionId} questionVersion={route.questionVersion} />}
        {route.name === 'feedbackAdmin' && <FeedbackAdmin />}
        {route.name === 'account' && <Account go={go} />}
        {route.name === 'privacy' && <Privacy go={go} />}
        {route.name === 'disciplines' && <Disciplines go={go} />}
        {route.name === 'discipline' && <DisciplinePage key={route.id} id={route.id} go={go} />}
        {route.name === 'materialNew' && <MaterialNew key={route.disciplineId} disciplineId={route.disciplineId} go={go} />}
        {route.name === 'material' && <MaterialPage key={route.id} id={route.id} go={go} />}
        {route.name === 'questions' && <QuestionsPage key={route.disciplineId + (route.topics?.join() ?? '') + (route.mode ?? '')} disciplineId={route.disciplineId} focus={route} go={go} />}
        {route.name === 'calendar' && <Calendar view={route.view} date={route.date} go={go} />}
        {route.name === 'event' && <EventPage key={route.id} id={route.id} go={go} />}
        {route.name === 'eventNew' && <EventForm key={`${route.date}-${route.disciplineId}-${route.type}`} date={route.date} disciplineId={route.disciplineId} type={EVENT_TYPES.includes(route.type as EventType) ? (route.type as EventType) : undefined} go={go} />}
        {route.name === 'eventEdit' && <EventForm key={route.id} id={route.id} go={go} />}
        {route.name === 'planner' && <Planner key={`${route.disciplineId}-${route.guideId}`} disciplineId={route.disciplineId} guideId={route.guideId} go={go} />}
        {route.name === 'guideNew' && <GuideNew key={route.disciplineId} disciplineId={route.disciplineId} go={go} />}
        {route.name === 'guide' && <GuidePage key={route.id} id={route.id} go={go} />}
        </ErrorBoundary>
      </main>
      <TabBar route={route} go={go} />
      <footer><span>✳ Study Mastery · v{__APP_VERSION__}</span><a href="#/feedback" className="foot-link">Feedback e melhorias</a><a href="#/ajuda" className="foot-link">Ajuda e diagnóstico</a></footer>
    </div>
  );
}
