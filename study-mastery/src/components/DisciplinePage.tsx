import { ArrowLeft, ChevronRight, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useCollection, usePersonal } from '../personal/context';
import { planDeletion } from '../personal/repo';
import { LIMITS, newId, nowIso, topicKey, type PTopic } from '../personal/types';
import { DisciplineForm, draftFrom, parseTopicLines } from './DisciplineForm';
import { spaceLabel } from './Disciplines';
import { isStuck, StatusBadge } from './MaterialPage';
import { useMaterialCtx } from './MaterialNew';
import { deleteMaterial } from '../materials/service';

export function DisciplinePage({ id, go }: { id: string; go: (to: string) => void }) {
  const p = usePersonal();
  const ctx = useMaterialCtx();
  const { items: disciplines, loading } = useCollection('disciplines');
  const { items: allTopics } = useCollection('topics');
  const { items: allMaterials } = useCollection('materials');
  const materials = allMaterials.filter((x) => x.disciplineId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const d = disciplines.find((x) => x.id === id);
  const topics = allTopics.filter((t) => t.disciplineId === id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'));
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<PTopic | null>(null);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="muted" role="status">Carregando…</p>;
  if (!d) {
    return (
      <section className="empty">
        <h1 className="screen-title">Disciplina não encontrada</h1>
        <p className="sub">Ela pode ter sido excluída ou pertencer a outro espaço ({spaceLabel(p.space.kind).toLowerCase()}).</p>
        <button type="button" className="primary" onClick={() => go('#/disciplinas')}>Ver suas disciplinas</button>
      </section>
    );
  }

  const addTopics = () => {
    const parsed = parseTopicLines(newTopic, topics.map((t) => t.name));
    if (parsed.error) return setMsg(parsed.error);
    if (!parsed.names.length) return setMsg(newTopic.trim() ? 'Esse assunto já existe nesta disciplina.' : 'Escreva o nome do assunto.');
    const now = nowIso();
    const start = topics.reduce((m, t) => Math.max(m, t.position + 1), 0);
    void run(async () => {
      await p.save('topics', parsed.names.map((name, i) => ({ id: newId(), disciplineId: d.id, name, position: start + i, origin: 'manual' as const, createdAt: now, updatedAt: now })));
      setNewTopic('');
    }, parsed.names.length === 1 ? 'Assunto adicionado.' : `${parsed.names.length} assuntos adicionados.`);
  };

  const saveRename = () => {
    if (!renaming) return;
    const name = renaming.name.trim().replace(/\s+/g, ' ');
    if (!name) return setMsg('O nome do assunto não pode ficar vazio.');
    if (name.length > LIMITS.topicName) return setMsg(`Cada assunto pode ter até ${LIMITS.topicName} caracteres.`);
    if (topics.some((t) => t.id !== renaming.id && topicKey(t.name) === topicKey(name))) return setMsg('Já existe um assunto com esse nome.');
    const t = topics.find((x) => x.id === renaming.id)!;
    void run(async () => {
      await p.save('topics', { ...t, name, updatedAt: nowIso() });
      setRenaming(null);
    }, 'Assunto renomeado.');
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/disciplinas')}><ArrowLeft size={18} aria-hidden="true" /> Disciplinas</button>
      {editing ? (
        <DisciplineForm
          initial={draftFrom(d)}
          creating={false}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSubmit={(x) => void run(async () => {
            await p.save('disciplines', { ...d, name: x.name, description: x.description, period: x.period || undefined, color: x.color, updatedAt: nowIso() });
            setEditing(false);
          }, 'Disciplina atualizada.')}
        />
      ) : (
        <header className="disc-head" data-c={d.color}>
          <h1 className="screen-title">{d.name}</h1>
          {(d.period || d.description) && <p className="sub">{[d.period, d.description].filter(Boolean).join(' — ')}</p>}
          <p className="space-tag">{spaceLabel(p.space.kind)}</p>
          <div className="row wrap">
            <button type="button" className="ghost" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" /> Editar</button>
            <button type="button" className="text-btn danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} aria-hidden="true" /> Excluir disciplina</button>
          </div>
        </header>
      )}

      {confirmDelete && (
        <div className="confirm" role="alertdialog" aria-label="Excluir disciplina">
          <p>Excluir “{d.name}”, {topics.length === 1 ? 'o assunto dela' : `os ${topics.length} assuntos dela`}{materials.length ? ` e ${materials.length === 1 ? 'o material' : `os ${materials.length} materiais`} (com arquivos e textos extraídos)` : ''} {p.space.kind === 'device' ? 'deste aparelho' : 'da sua conta'}? Não dá para desfazer.</p>
          <div className="row wrap">
            <button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => void run(async () => {
                const plan = planDeletion({ kind: 'disciplines', id: d.id }, { topics: allTopics, materials: allMaterials });
                // filhos antes dos pais; materiais um a um para apagar também o arquivo na pasta privada da conta
                for (const m of allMaterials.filter((x) => plan.materials.includes(x.id))) await deleteMaterial(ctx, m);
                await p.removeIds('topics', plan.topics);
                await p.removeIds('disciplines', plan.disciplines);
                go('#/disciplinas');
              })}
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      <section className="panel" aria-labelledby="h-mats">
        <div className="panel-head"><h2 id="h-mats"><FileText size={18} aria-hidden="true" /> Materiais</h2><small className="muted">{materials.length}</small></div>
        {materials.length === 0 ? (
          <p className="muted">Nenhum material ainda. Adicione o PDF de uma aula, uma lista ou cole o conteúdo da prova.</p>
        ) : (
          <ul className="mat-list">
            {materials.map((m) => (
              <li key={m.id}>
                <button type="button" className="mat-row" onClick={() => go(`#/material?id=${m.id}`)}>
                  <span className="mat-body"><strong>{m.title}</strong><small>{m.kind === 'pdf' ? 'PDF' : 'Texto'} · {m.pageCount} {m.kind === 'pdf' ? 'pág.' : 'trecho(s)'}</small></span>
                  <StatusBadge status={isStuck(m) ? 'falhou' : m.status} />
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="ghost" onClick={() => go(`#/material-novo?d=${d.id}`)}><Plus size={16} aria-hidden="true" /> Adicionar material</button>
      </section>

      <section className="panel" aria-labelledby="h-topics">
        <div className="panel-head"><h2 id="h-topics">Assuntos</h2><small className="muted">{topics.length}/{LIMITS.topicsPerDiscipline}</small></div>
        {topics.length === 0 ? (
          <p className="muted">Nenhum assunto ainda. Adicione os temas da ementa ou da prova para filtrar questões e montar o plano de estudos.</p>
        ) : (
          <ul className="topic-rows">
            {topics.map((t) => (
              <li key={t.id}>
                {renaming?.id === t.id ? (
                  <form className="inline-edit" onSubmit={(e) => { e.preventDefault(); saveRename(); }}>
                    <label className="sr-only" htmlFor={'rn-' + t.id}>Novo nome de {t.name}</label>
                    <input id={'rn-' + t.id} value={renaming.name} maxLength={LIMITS.topicName} autoFocus onChange={(e) => setRenaming({ id: t.id, name: e.target.value })} />
                    <button type="submit" className="text-btn" disabled={busy}>Salvar</button>
                    <button type="button" className="icon-btn small" aria-label="Cancelar" onClick={() => setRenaming(null)}><X size={16} aria-hidden="true" /></button>
                  </form>
                ) : (
                  <>
                    <span>{t.name}{t.origin === 'material' && <small className="muted"> · do material</small>}</span>
                    <span className="row-actions">
                      <button type="button" className="icon-btn small" aria-label={`Renomear ${t.name}`} onClick={() => setRenaming({ id: t.id, name: t.name })}><Pencil size={15} aria-hidden="true" /></button>
                      <button type="button" className="icon-btn small" aria-label={`Remover ${t.name}`} onClick={() => setRemoving(t)}><Trash2 size={15} aria-hidden="true" /></button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {removing && (
          <div className="confirm" role="alertdialog" aria-label="Remover assunto">
            <p>Remover o assunto “{removing.name}”?</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => setRemoving(null)}>Cancelar</button>
              <button type="button" className="danger" disabled={busy} onClick={() => void run(async () => { await p.removeIds('topics', [removing.id]); setRemoving(null); }, 'Assunto removido.')}>Remover</button>
            </div>
          </div>
        )}
        <form className="add-row" onSubmit={(e) => { e.preventDefault(); addTopics(); }}>
          <label className="field">
            <span>Adicionar assunto</span>
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} maxLength={LIMITS.topicName} placeholder="Ex.: Integrais por partes" />
          </label>
          <button type="submit" className="ghost" disabled={busy || topics.length >= LIMITS.topicsPerDiscipline}><Plus size={16} aria-hidden="true" /> Adicionar</button>
        </form>
      </section>
      <p role="status" className="hint">{msg}</p>
    </>
  );
}
