// Pontos de integração dos laboratórios com o resto do app. Todos somem quando não há exercício compatível, e nenhum
// depende de comparar nomes: banco existente por disciplina/assunto; disciplinas pessoais por associação explícita.
import { FlaskConical, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCatalog as useDisciplines } from '../calendar/hooks';
import { useLabCatalog } from './catalog';
import { countByKind, filterExercises } from './filters';
import { useAssociations, useLabActivity, useLabContext, useLabStore } from './hooks';
import { summarize } from './progress';
import { LABS, labByKind } from './registry';
import { LAB_SKILLS } from './skills';
import { DIFFICULTIES } from '../types';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Exercícios que cabem estritamente nesses assuntos (todas as dificuldades e profundidades). */
export function useLabMatches(disciplineId: string, topicIds: readonly string[]) {
  const { catalog } = useLabCatalog();
  const store = useLabStore();
  const { assoc } = useAssociations(store);
  const ctx = useLabContext(assoc);
  return useMemo(
    () => (catalog && disciplineId && topicIds.length ? filterExercises(catalog.exercises, { disciplineId, topicIds: [...topicIds], difficulties: [...DIFFICULTIES], kinds: [], scope: 'desafio' }, ctx) : []),
    [catalog, disciplineId, topicIds, ctx],
  );
}

/** "Praticar no Lab": aparece só quando há exercício prático para estes assuntos. */
export function LabPracticeLink({ disciplineId, topicIds, label = 'Praticar este assunto no Lab', go = (to) => (location.hash = to) }: { disciplineId: string; topicIds: readonly string[]; label?: string; go?: (to: string) => void }) {
  const matches = useLabMatches(disciplineId, topicIds);
  if (!LABS.length || !matches.length) return null;
  const kinds = [...countByKind(matches)].map(([k, n]) => `${labByKind(k)?.name ?? k}: ${n}`).join(' · ');
  return (
    <button type="button" className="ghost lab-link" onClick={() => go(`#/labs?d=${encodeURIComponent(disciplineId)}&t=${topicIds.map(encodeURIComponent).join(',')}`)}>
      <FlaskConical size={16} aria-hidden="true" /> {label} <small>({kinds})</small>
    </button>
  );
}

/** Seção "Prática nos Labs" da disciplina pessoal: associar assuntos a capacidades (explícito) e abrir a prática. */
export function LabsDisciplineSection({ disciplineId, go }: { disciplineId: string; go: (to: string) => void }) {
  const { catalog } = useLabCatalog();
  const store = useLabStore();
  const { assoc, setTopic, ready } = useAssociations(store);
  const ctx = useLabContext(assoc);
  const disciplines = useDisciplines();
  const d = disciplines.get(disciplineId);
  const [editing, setEditing] = useState<string | null>(null);
  if (!LABS.length || !d) return null;
  const all = catalog?.exercises ?? [];
  const matches = filterExercises(all, { disciplineId, topicIds: d.topics.map((t) => t.id), difficulties: [...DIFFICULTIES], kinds: [], scope: 'desafio' }, ctx);
  const skillsByKind = LABS.map((l) => ({ lab: l, skills: LAB_SKILLS.filter((s) => s.kind === l.kind && all.some((e) => e.skills.includes(s.id))) })).filter((x) => x.skills.length);
  return (
    <section className="panel" aria-labelledby="h-disc-labs">
      <div className="panel-head"><h2 id="h-disc-labs"><FlaskConical size={18} aria-hidden="true" /> Prática nos Labs</h2></div>
      {matches.length > 0 ? (
        <p>{[...countByKind(matches)].map(([k, n]) => `${labByKind(k)?.name ?? k} — ${plural(n, 'desafio disponível', 'desafios disponíveis')}`).join(' · ')}</p>
      ) : (
        <p className="muted">Nenhum assunto desta disciplina está associado a uma prática. Associe abaixo os assuntos que tratam de SQL, HTML/CSS/JS ou React — só você decide; nada é deduzido do nome.</p>
      )}
      {d.topics.length === 0 ? (
        <p className="hint">Cadastre os assuntos da disciplina para associá-los.</p>
      ) : (
        <ul className="topic-rows lab-assoc">
          {d.topics.map((t) => {
            const linked = assoc[t.id] ?? [];
            return (
              <li key={t.id}>
                <span>{t.name}<small className="muted">{linked.length ? ` · ${linked.map((s) => LAB_SKILLS.find((x) => x.id === s)?.label ?? s).join(', ')}` : ' · sem prática associada'}</small></span>
                <button type="button" className="text-btn" disabled={!ready} aria-expanded={editing === t.id} onClick={() => setEditing(editing === t.id ? null : t.id)}><Link2 size={14} aria-hidden="true" /> {linked.length ? 'Alterar' : 'Associar'}</button>
                {editing === t.id && (
                  <fieldset className="fs lab-assoc-edit">
                    <legend>Capacidades praticadas em “{t.name}”</legend>
                    {skillsByKind.map(({ lab, skills }) => (
                      <div key={lab.kind}>
                        <p className="hint">{lab.name}</p>
                        {skills.map((s) => (
                          <label key={s.id} className="check-row">
                            <input type="checkbox" checked={linked.includes(s.id)} onChange={() => void setTopic(t.id, linked.includes(s.id) ? linked.filter((x) => x !== s.id) : [...linked, s.id])} />
                            <span>{s.label}<small> · {s.detail}</small></span>
                          </label>
                        ))}
                      </div>
                    ))}
                    <p className="hint">Guardado só neste aparelho. Um exercício só entra se todas as capacidades dele estiverem associadas aos assuntos escolhidos.</p>
                  </fieldset>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > 0 && <button type="button" className="ghost" onClick={() => go(`#/labs?d=${encodeURIComponent(disciplineId)}`)}><FlaskConical size={16} aria-hidden="true" /> Abrir a prática</button>}
    </section>
  );
}

/** Seção do Progresso: evidência prática, separada dos acertos do quiz. */
export function LabsProgressSection({ go }: { go: (to: string) => void }) {
  const { catalog } = useLabCatalog();
  const store = useLabStore();
  const activity = useLabActivity(store);
  const disciplines = useDisciplines();
  if (!LABS.length || !catalog || !activity.ready) return null;
  const p = summarize(catalog.exercises, activity.attempts, activity.started, activity.practiceMs);
  if (!p.started) return null;
  const topicName = (id: string) => disciplines.list.flatMap((d) => d.topics).find((t) => t.id === id)?.name ?? id;
  return (
    <section className="panel" aria-labelledby="h-prog-labs">
      <div className="panel-head"><h2 id="h-prog-labs"><FlaskConical size={18} aria-hidden="true" /> Prática nos Labs</h2></div>
      <p className="hint">Evidência prática, separada dos acertos do quiz: um laboratório concluído não é somado às questões objetivas.</p>
      <div className="metrics">
        <div><span>INICIADOS</span><strong>{p.started}</strong><small>exercícios</small></div>
        <div><span>CONCLUÍDOS</span><strong>{p.completed}</strong><small>aprovados ao menos 1 vez</small></div>
        <div><span>TENTATIVAS</span><strong>{p.attempts}</strong><small>{p.practiceMinutes ? `~${p.practiceMinutes} min de prática` : 'verificações'}</small></div>
      </div>
      <ul className="plain">
        {Object.entries(p.byKind).map(([k, v]) => <li key={k}><b>{labByKind(k)?.name ?? k}</b>: {v.completed} de {v.started} concluídos · {plural(v.attempts, 'tentativa', 'tentativas')}</li>)}
      </ul>
      {p.consolidatedTopics.length > 0 && <p>Prática consolidada (3+ desafios concluídos, ao menos um médio ou difícil): {p.consolidatedTopics.map(topicName).join(', ')}.</p>}
      <button type="button" className="ghost" onClick={() => go('#/labs')}>Abrir os Labs</button>
    </section>
  );
}
