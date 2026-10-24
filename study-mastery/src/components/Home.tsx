import { ArrowRight, CalendarDays, ChevronRight, Flame, History, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { reviewCounts } from '../lib/engine';
import { qualitySummary } from '../lib/quality';
import { MODE_LABEL } from '../types';
import { useStudy } from '../state';
import { useAccount } from '../account';
import { useTimeZone } from '../calendar/hooks';
import { pendingActivities, upcomingExams } from '../lib/progress';
import { usePersonalOptional } from '../personal/context';

export function Home({ go }: { go: (to: string) => void }) {
  const { bank, state } = useStudy();
  const account = useAccount();
  const where = account.status === 'signedIn' ? 'Seu progresso fica na sua conta, em qualquer aparelho.' : account.configured ? 'Sem custo. Use sem cadastro ou entre na sua conta para levar o progresso a outros aparelhos.' : 'Sem cadastro, sem custo — seu progresso fica neste aparelho.';
  const goal = bank.taxonomy.disciplines.reduce((s, d) => s + d.topics.reduce((a, t) => a + t.quota.facil + t.quota.medio + t.quota.dificil, 0), 0);
  const answers = useMemo(() => state.attempts.flatMap((a) => a.answers), [state.attempts]);
  const acc = answers.length ? Math.round((100 * answers.filter((a) => a.correct).length) / answers.length) : null;
  const due = useMemo(() => reviewCounts(bank.questions, state.stats), [bank.questions, state.stats]);
  const qa = useMemo(() => qualitySummary(bank.questions), [bank.questions]);
  const active = state.active;
  const activeDone = active ? Object.keys(active.answers).length : 0;
  const [tz] = useTimeZone();
  const personal = usePersonalOptional();
  const events = personal?.items('events');
  useEffect(() => {
    if (personal && !events) void personal.load('events');
  }, [personal, events]);
  const now = Date.now();
  const nextExam = upcomingExams(events ?? [], now, tz, 21)[0];
  const pending = pendingActivities(events ?? [], now, tz);
  const agendaNote = [pending.overdue.length ? `${pending.overdue.length} atrasada${pending.overdue.length === 1 ? '' : 's'}` : '', pending.today.length ? `${pending.today.length} para hoje` : ''].filter(Boolean).join(' · ');
  const hasExam = bank.taxonomy.disciplines.some((d) => d.topics.some((t) => t.examFocus && bank.questions.some((q) => q.topicId === t.id)));

  return (
    <>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} aria-hidden="true" /> SEU ESPAÇO DE EVOLUÇÃO</div>
        <h1>Aprenda mais.<br /><em>Vá além da prova.</em></h1>
        <p>Escolha exatamente o que estudar, pratique no seu ritmo e entenda cada resposta. {where}</p>
        <div className="hero-actions">
          <button type="button" className="primary" onClick={() => go('#/setup')}>Começar a estudar <ArrowRight size={18} aria-hidden="true" /></button>
          {hasExam && (
            <button type="button" className="ghost" onClick={() => go('#/setup?d=calculo2&preset=exam')}><Target size={17} aria-hidden="true" /> Foco da prova de 26/10</button>
          )}
        </div>
        <div className="hero-glow" aria-hidden="true">✦</div>
      </section>

      {active && (
        <button type="button" className="resume" onClick={() => go('#/quiz')}>
          <History size={20} aria-hidden="true" />
          <span>
            <strong>Continuar sessão em andamento</strong>
            <small>{MODE_LABEL[active.session.config.mode]} · {activeDone} de {active.session.items.length} respondidas</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      {(nextExam || agendaNote) && (
        <button type="button" className="resume" onClick={() => go('#/agenda')}>
          <CalendarDays size={20} aria-hidden="true" />
          <span>
            <strong>{nextExam ? `${nextExam.event.title}: ${nextExam.daysLeft === 0 ? 'é hoje' : nextExam.daysLeft === 1 ? 'amanhã' : `em ${nextExam.daysLeft} dias`}` : 'Agenda'}</strong>
            <small>{agendaNote || 'Abrir a agenda'}</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      <div className="section-heading"><h2>Escolha uma disciplina</h2><span>{bank.taxonomy.semester}</span></div>
      <div className="course-grid">
        {bank.taxonomy.disciplines.map((d) => {
          const total = bank.questions.filter((q) => q.disciplineId === d.id).length;
          const meta = d.topics.reduce((a, t) => a + t.quota.facil + t.quota.medio + t.quota.dificil, 0);
          const seen = Object.keys(state.stats).filter((id) => bank.byId.get(id)?.disciplineId === d.id).length;
          return (
            <button key={d.id} type="button" className={'course ' + d.accent} onClick={() => go(`#/setup?d=${d.id}`)}>
              <span className="course-icon" aria-hidden="true">{d.icon}</span>
              <span className="course-body">
                <strong>{d.name}</strong>
                <small>{d.subtitle}</small>
                <span className="meter" aria-hidden="true"><i style={{ width: `${total ? Math.round((100 * seen) / total) : 0}%` }} /></span>
                <small className="muted">{total} questões disponíveis · {seen} já praticadas{total < meta ? ` · meta ${meta}` : ''}</small>
                <b>Explorar disciplina <ChevronRight size={14} aria-hidden="true" /></b>
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-heading"><h2>Sua jornada</h2><span>{account.status === 'signedIn' ? 'Salvo na conta' : 'Salvo no dispositivo'}</span></div>
      <div className="metrics">
        <div><span>SESSÕES</span><strong>{state.attempts.length}</strong><small>concluídas</small></div>
        <div><span>ACERTOS</span><strong>{acc === null ? '—' : acc + '%'}</strong><small>média geral</small></div>
        <div><span>PARA REVISAR</span><strong>{due.errors + due.due}</strong><small>{due.errors} erros · {due.due} vencidas</small></div>
      </div>
      <p className="bank-note"><Flame size={14} aria-hidden="true" /><span>Banco existente: <b>{bank.questions.length}</b> questões disponíveis{bank.questions.length < goal ? ` de ${goal} planejadas` : ''}, com gabarito conferido e revisão assistida por IA. {qa.humanReviewed === 0 ? 'Revisão humana pendente.' : `${qa.humanReviewed} com revisão humana.`} <a href="#/library">Como verificamos as questões</a></span></p>
    </>
  );
}
