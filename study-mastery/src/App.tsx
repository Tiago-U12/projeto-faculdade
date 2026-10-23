import { useEffect } from 'react';
import { Header } from './components/Header';
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
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app">
      <a className="skip" href="#main">Pular para o conteúdo</a>
      <Header route={route} go={go} />
      <main id="main" className="container">
        {route.name === 'home' && <Home go={go} />}
        {route.name === 'setup' && <Setup key={`${route.disciplineId}-${route.preset}`} route={route} go={go} />}
        {route.name === 'quiz' && <Quiz go={go} />}
        {route.name === 'results' && <Results attemptId={route.id} go={go} />}
        {route.name === 'progress' && <Progress go={go} />}
        {route.name === 'library' && <Library go={go} />}
      </main>
      <footer><span>✳ Study Mastery · v{__APP_VERSION__}</span><span>Aprender é construir.</span></footer>
    </div>
  );
}
