import { Archive, ArchiveRestore, ArrowLeft, Check, CheckCircle2, Pencil, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { similarity, structureProblems } from '../../supabase/functions/_shared/generation';
import { personalPool } from '../lib/engine';
import { aiStatusText, requestGeneration, useAiStatus, waitJob } from '../personal/ai';
import { useCollection, usePersonal } from '../personal/context';
import { usePersonalQuiz } from '../personal/quiz';
import { LIMITS, newId, nowIso, QUESTION_STATUS_LABEL, type PDiscipline, type PMaterial, type PQuestion, type PTopic } from '../personal/types';
import { useStudy } from '../state';
import { DIFFICULTIES, DIFFICULTY_LABEL, MODE_LABEL, type Difficulty, type Mode, type PersonalQuizQuestion, type SessionConfig } from '../types';
import { personalProvenance, PersonalSources } from './Explanation';
import { plural } from './MaterialPage';
import { RichText } from './RichText';
import { AI_SENDS } from './Privacy';

type Filter = 'todas' | 'ativas' | 'reportada' | 'arquivada';
const FILTER_LABEL: Record<Filter, string> = { todas: 'Todas', ativas: 'Disponíveis', reportada: 'Com erro relatado', arquivada: 'Arquivadas' };
const usable = (q: { status: string }) => q.status !== 'reportada' && q.status !== 'arquivada';
const originStatus = (q: PQuestion): PQuestion['status'] => (q.origin.kind === 'ia' ? 'gerada_ia' : 'criada_aluno');

/** Questões pessoais de uma disciplina: praticar, gerar a partir do material (com conta), criar, editar e arquivar. */
export function QuestionsPage({ disciplineId, focus, go }: { disciplineId: string; focus?: { topics?: string[]; mode?: Mode }; go: (to: string) => void }) {
  const p = usePersonal();
  const { items: disciplines, loading } = useCollection('disciplines');
  const { items: allTopics } = useCollection('topics');
  const { items: allMaterials } = useCollection('materials');
  const { items: allQuestions } = useCollection('questions');
  const { questions: quiz } = usePersonalQuiz(disciplineId);
  const d = disciplines.find((x) => x.id === disciplineId);
  const topics = allTopics.filter((t) => t.disciplineId === disciplineId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'));
  const materials = allMaterials.filter((m) => m.disciplineId === disciplineId);
  const questions = allQuestions.filter((q) => q.disciplineId === disciplineId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [form, setForm] = useState<PQuestion | 'new' | null>(null);
  const [filter, setFilter] = useState<Filter>('todas');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (loading) return <p className="muted" role="status">Carregando…</p>;
  if (!d) {
    return (
      <section className="empty">
        <h1 className="screen-title">Disciplina não encontrada</h1>
        <p className="sub">Ela pode ter sido excluída ou pertencer a outro espaço.</p>
        <button type="button" className="primary" onClick={() => go('#/disciplinas')}>Ver suas disciplinas</button>
      </section>
    );
  }
  const quizById = new Map(quiz.map((q) => [q.id, q]));
  const shown = questions.filter((q) => (filter === 'todas' ? true : filter === 'ativas' ? usable(q) : q.status === filter));
  const save = async (q: PQuestion, ok: string) => {
    setMsg(null);
    try {
      await p.save('questions', q);
      setMsg({ ok: true, text: ok });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return false;
    }
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/disciplina?id=${d.id}`)}><ArrowLeft size={18} aria-hidden="true" /> {d.name}</button>
      <h1 className="screen-title">Questões pessoais</h1>
      <p className="sub">{d.name} · separadas do banco existente. Questões geradas por IA passam só por checagens automáticas (formato, alternativas, trecho conferido no seu material, duplicatas): cálculos e código não são conferidos por ferramenta e não há revisão humana.</p>

      <PracticePanel d={d} topics={topics} quiz={quiz} focus={focus} go={go} />
      <GeneratePanel d={d} topics={topics} materials={materials} existing={questions.length} onDone={(text, ok) => setMsg({ ok, text })} />

      <section className="panel" aria-labelledby="h-qlist">
        <div className="panel-head">
          <h2 id="h-qlist">Suas questões</h2>
          <small className="muted">{questions.length}</small>
        </div>
        {form ? (
          <QuestionForm
            initial={form === 'new' ? undefined : form}
            d={d}
            topics={topics}
            others={questions.filter((q) => form === 'new' || q.id !== form.id)}
            onCancel={() => setForm(null)}
            onSave={async (q) => {
              if (await save(q, form === 'new' ? 'Questão criada.' : `Questão atualizada (versão ${q.version}). O histórico mantém a versão que você respondeu.`)) setForm(null);
            }}
          />
        ) : (
          <button type="button" className="ghost" disabled={!topics.length} onClick={() => setForm('new')}><Plus size={16} aria-hidden="true" /> Criar questão</button>
        )}
        {!topics.length && <p className="hint">Cadastre ao menos um assunto na disciplina para criar ou gerar questões.</p>}
        {questions.length > 0 && (
          <ul className="chips filter-chips" aria-label="Filtrar questões">
            {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
              <li key={f}><button type="button" className={'chip' + (filter === f ? ' on' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>{FILTER_LABEL[f]}</button></li>
            ))}
          </ul>
        )}
        {questions.length === 0 ? (
          <p className="muted">Nenhuma questão ainda. Crie as suas ou, com conta, gere a partir de um material pronto.</p>
        ) : (
          topics.map((t) => {
            const list = shown.filter((q) => q.topicId === t.id);
            if (!list.length) return null;
            return (
              <div key={t.id} className="q-group">
                <h3>{t.name} <small className="muted">· {list.length}</small></h3>
                <ul className="q-list">
                  {list.map((q) => (
                    <QuestionItem
                      key={q.id}
                      q={q}
                      quiz={quizById.get(q.id)}
                      onEdit={() => setForm(q)}
                      onStatus={(status, ok) => void save({ ...q, status, ...(status !== 'reportada' && status !== 'arquivada' ? { reportNote: undefined } : {}), updatedAt: nowIso() }, ok)}
                      onDelete={async () => {
                        try {
                          await p.removeIds('questions', [q.id]);
                          setMsg({ ok: true, text: 'Questão excluída. As tentativas antigas mantêm a cópia que você respondeu.' });
                        } catch (e) {
                          setMsg({ ok: false, text: (e as Error).message });
                        }
                      }}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}
        {questions.length > 0 && shown.length === 0 && <p className="muted">Nenhuma questão com esse filtro.</p>}
      </section>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </>
  );
}

function PracticePanel({ d, topics, quiz, focus, go }: { d: PDiscipline; topics: PTopic[]; quiz: PersonalQuizQuestion[]; focus?: { topics?: string[]; mode?: Mode }; go: (to: string) => void }) {
  const { startPersonal } = useStudy();
  const available = useMemo(() => quiz.filter(usable), [quiz]);
  const count = (topicId: string) => available.filter((q) => q.topicId === topicId).length;
  const withQ = topics.filter((t) => count(t.id) > 0);
  // vindo da agenda: só os assuntos do evento (mesmo os sem questões, para o aviso ficar claro)
  const [topicIds, setTopicIds] = useState<string[] | null>(focus?.topics?.length ? focus.topics.filter((t) => topics.some((x) => x.id === t)) : null);
  const chosen = topicIds ?? withQ.map((t) => t.id);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([...DIFFICULTIES]);
  const [mode, setMode] = useState<Mode>(focus?.mode ?? 'aprender');
  const [size, setSize] = useState(20);
  const cfg: SessionConfig = { disciplineId: d.id, topicIds: chosen, difficulties, scope: 'aula', mode, size };
  const pool = personalPool(quiz, cfg);
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  return (
    <section className="panel" aria-labelledby="h-practice">
      <div className="panel-head"><h2 id="h-practice"><Play size={18} aria-hidden="true" /> Praticar</h2><small className="muted">{available.length} disponíveis</small></div>
      {withQ.length === 0 ? (
        <p className="muted">Ainda não há questões disponíveis para praticar nesta disciplina.</p>
      ) : (
        <>
          <fieldset className="fs">
            <legend>Assuntos</legend>
            <ul className="chips">
              {topics.filter((t) => count(t.id) > 0 || chosen.includes(t.id)).map((t) => (
                <li key={t.id}><button type="button" className={'chip' + (chosen.includes(t.id) ? ' on' : '')} aria-pressed={chosen.includes(t.id)} onClick={() => setTopicIds(toggle(chosen, t.id))}>{t.name} · {count(t.id)}</button></li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="fs">
            <legend>Dificuldade</legend>
            <ul className="chips">
              {DIFFICULTIES.map((x) => (
                <li key={x}><button type="button" className={'chip' + (difficulties.includes(x) ? ' on' : '')} aria-pressed={difficulties.includes(x)} onClick={() => setDifficulties(toggle(difficulties, x))}>{DIFFICULTY_LABEL[x]}</button></li>
              ))}
            </ul>
          </fieldset>
          <div className="row wrap practice-opts">
            <label className="field compact">
              <span>Modo</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                {(['aprender', 'simulado', 'revisao', 'misto'] as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
              </select>
            </label>
            <label className="field compact">
              <span>Questões</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {[5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {pool.length === 0 ? (
            <p className="form-error" role="status">Nenhuma questão disponível com esses filtros.</p>
          ) : pool.length < size ? (
            <p className="hint" role="status">Há só {plural(pool.length, 'questão', 'questões')} com esses filtros: a sessão terá {pool.length}. Não completamos com outros assuntos nem repetimos questões.</p>
          ) : null}
          <button type="button" className="primary" disabled={!pool.length} onClick={() => { if (startPersonal(cfg, quiz)) go('#/quiz'); }}>
            Começar ({Math.min(pool.length, size)})
          </button>
        </>
      )}
    </section>
  );
}

function GeneratePanel({ d, topics, materials, existing, onDone }: { d: PDiscipline; topics: PTopic[]; materials: PMaterial[]; existing: number; onDone: (text: string, ok: boolean) => void }) {
  const p = usePersonal();
  const { status, client } = useAiStatus();
  const ready = materials.filter((m) => m.status === 'pronto');
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const [qty, setQty] = useState(5);
  const [diff, setDiff] = useState<Difficulty | ''>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<{ created: number; rejected: { stem: string; reasons: string[] }[]; note?: string } | null>(null);

  useEffect(() => {
    if (!topics.some((t) => t.id === topicId) && topics[0]) setTopicId(topics[0].id);
  }, [topics, topicId]);
  useEffect(() => {
    // ao trocar o assunto, sugere os materiais associados a ele (o estudante confirma)
    setPicked(ready.filter((m) => m.topicIds.includes(topicId)).map((m) => m.id));
  }, [topicId, ready.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (!client) return;
    setBusy('Enviando o pedido…');
    setReport(null);
    try {
      const sb = await client();
      const r = await requestGeneration(sb, { op: 'questoes', disciplineId: d.id, topicId, materialIds: picked, quantidade: qty, ...(diff ? { dificuldade: diff } : {}) });
      if (!r.job) throw new Error('O servidor não devolveu a tarefa de geração.');
      setBusy('Gerando e conferindo as questões… (pode levar até 2 minutos)');
      const j = r.job.status === 'running' ? await waitJob(sb, r.job.id) : r.job;
      if (j.status === 'failed') throw new Error(j.error ?? 'A geração falhou.');
      const res = (j.result ?? {}) as { criadas?: number; rejeitadas?: { stem: string; reasons: string[] }[]; observacao?: string };
      await p.load('questions');
      setReport({ created: res.criadas ?? 0, rejected: res.rejeitadas ?? [], note: res.observacao || undefined });
      onDone(r.reused ? 'Este pedido já tinha sido feito com o mesmo material: mostramos o resultado anterior, sem gerar de novo.' : `${plural(res.criadas ?? 0, 'questão criada', 'questões criadas')}.`, true);
    } catch (e) {
      onDone((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel" aria-labelledby="h-gen">
      <div className="panel-head"><h2 id="h-gen"><Sparkles size={18} aria-hidden="true" /> Gerar a partir do material</h2></div>
      <p className={status.kind === 'on' ? 'hint' : 'muted'} role="status">{aiStatusText(status)}</p>
      {status.kind === 'on' && (
        !topics.length || !ready.length ? (
          <p className="muted">É preciso ter um assunto e um material com estado “Pronto” nesta disciplina.</p>
        ) : (
          <>
            <div className="row wrap practice-opts">
              <label className="field compact">
                <span>Assunto</span>
                <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="field compact">
                <span>Quantidade</span>
                <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {[3, 5, LIMITS.questionsPerBatch].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="field compact">
                <span>Dificuldade</span>
                <select value={diff} onChange={(e) => setDiff(e.target.value as Difficulty | '')}>
                  <option value="">Variada</option>
                  {DIFFICULTIES.map((x) => <option key={x} value={x}>{DIFFICULTY_LABEL[x]}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="fs">
              <legend>Materiais usados</legend>
              <ul className="pick-list">
                {ready.map((m) => (
                  <li key={m.id}>
                    <label className="check-row">
                      <input type="checkbox" checked={picked.includes(m.id)} onChange={() => setPicked((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id].slice(0, 10)))} />
                      <span>{m.title}<small> · {m.kind === 'pdf' ? 'PDF' : 'texto'}{m.topicIds.includes(topicId) ? ' · associado ao assunto' : ''}</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <p className="hint">{AI_SENDS} <a href="#/dados">Seus dados</a></p>
            <p className="hint">Até {LIMITS.questionsPerBatch} por pedido. Só ficam as questões que citam um trecho existente na página indicada; as outras são descartadas e listadas aqui. Pedido igual com o mesmo material não gera de novo. Você tem {existing} questões nesta disciplina.</p>
            <button type="button" className="primary" disabled={!!busy || !picked.length || !topicId} onClick={() => void run()}><Sparkles size={16} aria-hidden="true" /> Gerar {qty} questões</button>
          </>
        )
      )}
      {busy && <p className="hint" role="status">{busy}</p>}
      {report && (
        <div className="gen-report">
          <p><CheckCircle2 size={15} aria-hidden="true" /> {plural(report.created, 'questão aceita', 'questões aceitas')}{report.rejected.length ? ` · ${plural(report.rejected.length, 'descartada', 'descartadas')}` : ''}.</p>
          {report.rejected.length > 0 && (
            <details>
              <summary>Por que foram descartadas</summary>
              <ul>{report.rejected.map((r, i) => <li key={i}><b>{r.stem || '(sem enunciado)'}</b> — {r.reasons.join('; ')}</li>)}</ul>
            </details>
          )}
          {report.note && <p className="muted">Observação da geração: {report.note}</p>}
        </div>
      )}
    </section>
  );
}

const IDS = ['a', 'b', 'c', 'd'];

export function QuestionForm({ initial, d, topics, others, onSave, onCancel }: { initial?: PQuestion; d: PDiscipline; topics: PTopic[]; others: PQuestion[]; onSave: (q: PQuestion) => Promise<void>; onCancel: () => void }) {
  const [topicId, setTopicId] = useState(initial?.topicId ?? topics[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medio');
  const [stem, setStem] = useState(initial?.stem ?? '');
  const [options, setOptions] = useState<string[]>(() => IDS.map((id) => initial?.options.find((o) => o.id === id)?.text ?? ''));
  const [correct, setCorrect] = useState(initial ? Math.max(0, IDS.indexOf(initial.correctOptionId)) : 0);
  const [explanation, setExplanation] = useState(initial?.explanation.correct ?? '');
  const [steps, setSteps] = useState((initial?.explanation.steps ?? []).join('\n'));
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const opts = options.map((t) => t.trim());
    const problems = structureProblems({ stem: stem.trim(), options: opts.map((text) => ({ text })), correctIndex: correct, explanation: explanation.trim() });
    const twin = others.find((q) => q.topicId === topicId && similarity(q.stem, stem) >= 0.8);
    if (twin) problems.push('muito parecida com outra questão deste assunto');
    setErr(problems);
    if (problems.length) return;
    const now = nowIso();
    const newOptions = IDS.map((id, i) => ({ id, text: opts[i] }));
    const sameAnswers = !!initial && initial.correctOptionId === IDS[correct] && initial.options.every((o, i) => o.text === newOptions[i]?.text);
    const explanationBlock = { correct: explanation.trim(), wrong: sameAnswers ? initial!.explanation.wrong : {}, steps: steps.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 12) };
    const q: PQuestion = initial
      ? { ...initial, topicId, difficulty, stem: stem.trim(), options: newOptions, correctOptionId: IDS[correct], explanation: explanationBlock, version: initial.version + 1, status: originStatus(initial), reportNote: undefined, origin: initial.origin.kind === 'ia' ? { ...initial.origin, editedAt: now } : initial.origin, updatedAt: now }
      : { id: newId(), disciplineId: d.id, topicId, status: 'criada_aluno', difficulty, version: 1, materialIds: [], stem: stem.trim(), options: newOptions, correctOptionId: IDS[correct], explanation: explanationBlock, refs: [], origin: { kind: 'aluno' }, createdAt: now, updatedAt: now };
    setBusy(true);
    await onSave(q).finally(() => setBusy(false));
  };

  return (
    <form className="form q-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <h3>{initial ? `Editar questão (passará para a versão ${initial.version + 1})` : 'Nova questão'}</h3>
      <div className="row wrap practice-opts">
        <label className="field compact">
          <span>Assunto</span>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </label>
        <label className="field compact">
          <span>Dificuldade</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>{DIFFICULTIES.map((x) => <option key={x} value={x}>{DIFFICULTY_LABEL[x]}</option>)}</select>
        </label>
      </div>
      <label className="field">
        <span>Enunciado <small>· aceita fórmulas entre $…$</small></span>
        <textarea rows={3} value={stem} maxLength={2000} onChange={(e) => setStem(e.target.value)} />
      </label>
      <fieldset className="fs">
        <legend>Alternativas (marque a correta)</legend>
        {IDS.map((id, i) => (
          <div key={id} className="opt-row">
            <input type="radio" name="correta" aria-label={`Alternativa ${id.toUpperCase()} é a correta`} checked={correct === i} onChange={() => setCorrect(i)} />
            <label className="sr-only" htmlFor={'opt-' + id}>Alternativa {id.toUpperCase()}</label>
            <input id={'opt-' + id} value={options[i]} maxLength={500} placeholder={`Alternativa ${id.toUpperCase()}`} onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
        ))}
      </fieldset>
      <label className="field">
        <span>Por que a correta está certa</span>
        <textarea rows={3} value={explanation} maxLength={3000} onChange={(e) => setExplanation(e.target.value)} />
      </label>
      <label className="field">
        <span>Passo a passo <small>· opcional, um por linha</small></span>
        <textarea rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      {initial?.origin.kind === 'ia' && <p className="hint">As checagens automáticas feitas na geração valem para a versão gerada; a questão editada aparece como “editada por você”.</p>}
      {err.length > 0 && <p className="form-error" role="alert">Ajuste antes de salvar: {err.join('; ')}.</p>}
      <div className="row wrap">
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}><Check size={16} aria-hidden="true" /> Salvar</button>
      </div>
    </form>
  );
}

function QuestionItem({ q, quiz, onEdit, onStatus, onDelete }: { q: PQuestion; quiz?: PersonalQuizQuestion; onEdit: () => void; onStatus: (s: PQuestion['status'], ok: string) => void; onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className={'q-item st-' + q.status}>
      <details>
        <summary>
          <span className="q-stem">{q.stem.length > 140 ? q.stem.slice(0, 140) + '…' : q.stem}</span>
          <span className="q-meta">
            <span className={'q-badge st-' + q.status}>{QUESTION_STATUS_LABEL[q.status]}</span>
            {q.origin.editedAt && <span className="q-badge">editada</span>}
            <small>{DIFFICULTY_LABEL[q.difficulty]} · v{q.version}</small>
          </span>
        </summary>
        <div className="q-body">
          <RichText as="p" text={q.stem} />
          <ol className="q-opts" type="A">
            {q.options.map((o) => (
              <li key={o.id} className={o.id === q.correctOptionId ? 'right' : ''}><RichText text={o.text} />{o.id === q.correctOptionId && <b> · correta</b>}</li>
            ))}
          </ol>
          <RichText as="p" className="muted" text={q.explanation.correct} />
          {q.status === 'reportada' && q.reportNote && <p className="form-error">Erro relatado: {q.reportNote}</p>}
          {quiz && <PersonalSources q={quiz} />}
          {quiz && <p className="src-meta">{personalProvenance(quiz)}</p>}
          <div className="row wrap">
            <button type="button" className="ghost" onClick={onEdit}><Pencil size={15} aria-hidden="true" /> Editar</button>
            {q.status === 'reportada' && <button type="button" className="ghost" onClick={() => onStatus(originStatus(q), 'Questão de volta às sessões.')}><Check size={15} aria-hidden="true" /> Já conferi, liberar</button>}
            {q.status === 'arquivada' ? (
              <button type="button" className="ghost" onClick={() => onStatus(originStatus(q), 'Questão reativada.')}><ArchiveRestore size={15} aria-hidden="true" /> Reativar</button>
            ) : (
              <button type="button" className="ghost" onClick={() => onStatus('arquivada', 'Questão arquivada: fica fora das sessões.')}><Archive size={15} aria-hidden="true" /> Arquivar</button>
            )}
            <button type="button" className="text-btn danger-text" onClick={() => setConfirm(true)}><Trash2 size={14} aria-hidden="true" /> Excluir</button>
          </div>
          {confirm && (
            <div className="confirm" role="alertdialog" aria-label="Excluir questão">
              <p>Excluir esta questão? As tentativas antigas mantêm a cópia que você respondeu. Para só tirá-la das sessões, use “Arquivar”.</p>
              <div className="row wrap">
                <button type="button" className="ghost" onClick={() => setConfirm(false)}>Cancelar</button>
                <button type="button" className="danger" onClick={() => void onDelete()}>Excluir</button>
              </div>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
