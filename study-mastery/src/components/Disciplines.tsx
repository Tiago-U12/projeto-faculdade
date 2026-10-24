import { ChevronRight, NotebookTabs, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCollection, usePersonal } from '../personal/context';
import { LIMITS, newId, nowIso, type PDiscipline, type PTopic } from '../personal/types';
import { DisciplineForm, draftFrom, parseTopicLines, type DisciplineDraft } from './DisciplineForm';

export function spaceLabel(kind: 'device' | 'account') {
  return kind === 'device' ? 'Salvo neste aparelho' : 'Salvo na sua conta';
}

/** Disciplinas do estudante (separadas do banco existente de Cálculo II e Full Stack). */
export function Disciplines({ go }: { go: (to: string) => void }) {
  const p = usePersonal();
  const { items: disciplines, loading } = useCollection('disciplines');
  const { items: topics } = useCollection('topics');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const create = async (d: DisciplineDraft) => {
    const parsed = parseTopicLines(d.topics);
    if (parsed.error) return setMsg(parsed.error);
    setBusy(true);
    setMsg('');
    try {
      const now = nowIso();
      const disc: PDiscipline = { id: newId(), name: d.name, description: d.description, period: d.period || undefined, color: d.color, createdAt: now, updatedAt: now };
      await p.save('disciplines', disc);
      const ts: PTopic[] = parsed.names.map((name, i) => ({ id: newId(), disciplineId: disc.id, name, position: i, origin: 'manual', createdAt: now, updatedAt: now }));
      if (ts.length) await p.save('topics', ts);
      setCreating(false);
      go(`#/disciplina?id=${disc.id}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...disciplines].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <>
      <h1 className="screen-title">Suas <em>disciplinas.</em></h1>
      <p className="sub">Cadastre as matérias do semestre com assuntos e, depois, materiais e provas. {spaceLabel(p.space.kind)}{p.space.kind === 'device' ? ' — entre na sua conta para usar em outros aparelhos.' : '.'}</p>
      {p.error && <p className="notice" role="alert">{p.error}</p>}

      {creating ? (
        <DisciplineForm initial={draftFrom(undefined, disciplines.map((d) => d.color))} creating busy={busy} onSubmit={create} onCancel={() => setCreating(false)} />
      ) : (
        <button type="button" className="primary" disabled={loading || disciplines.length >= LIMITS.disciplines} onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Nova disciplina</button>
      )}
      {msg && <p className="form-error" role="alert">{msg}</p>}

      {loading ? (
        <p className="muted" role="status">Carregando…</p>
      ) : sorted.length === 0 ? (
        !creating && (
          <section className="empty-card">
            <NotebookTabs size={28} aria-hidden="true" />
            <p><b>Nenhuma disciplina sua ainda.</b> Crie a primeira para organizar assuntos, materiais e provas. Cálculo II e Full Stack continuam no início, com o banco de questões existente.</p>
          </section>
        )
      ) : (
        <ul className="disc-list">
          {sorted.map((d) => {
            const n = topics.filter((t) => t.disciplineId === d.id).length;
            return (
              <li key={d.id}>
                <button type="button" className="disc-card" data-c={d.color} onClick={() => go(`#/disciplina?id=${d.id}`)}>
                  <span className="disc-body">
                    <strong>{d.name}</strong>
                    <small>{[d.period, `${n} assunto${n === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {disciplines.length >= LIMITS.disciplines && <p className="hint">Limite de {LIMITS.disciplines} disciplinas atingido.</p>}
    </>
  );
}
