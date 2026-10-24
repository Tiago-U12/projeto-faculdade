import { AlertTriangle, ArrowLeft, BookOpen, CalendarDays, Check, History, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { extractiveSection, SECTION_KINDS, SECTION_LABEL, type SourcePage } from '../../supabase/functions/_shared/generation';
import { aiStatusText, requestGeneration, useAiStatus, waitJob, type AiStatus } from '../personal/ai';
import { useCollection, usePersonal } from '../personal/context';
import type { PersonalRepo } from '../personal/repo';
import { LIMITS, newId, nowIso, type GuideItem, type GuideSection, type PGuide, type PMaterial, type PTopic, type SectionKind } from '../personal/types';
import { plural, StatusBadge } from './MaterialPage';
import { RichText } from './RichText';

export const NOT_A_PREDICTION = 'O Study Mastery não sabe o que vai cair na avaliação: o guia cobre só os assuntos que você confirmou, a partir dos seus materiais.';

async function sourcePages(repo: PersonalRepo, mats: PMaterial[]): Promise<SourcePage[]> {
  const out: SourcePage[] = [];
  for (const m of mats) for (const pg of await repo.getPages(m.id)) out.push({ materialId: m.id, materialTitle: m.title, unit: m.kind === 'pdf' ? 'página' : 'trecho', page: pg.page, text: pg.text });
  return out;
}

/** Seção sem IA: trechos do material que mencionam o assunto, com a página. */
function trechos(topic: PTopic, pages: SourcePage[], mats: PMaterial[], version = 1): GuideSection {
  return { key: `${topic.id}:trechos`, topicId: topic.id, kind: 'trechos', status: 'pronta', generator: 'trechos', items: extractiveSection(topic.name, pages), materialVersions: Object.fromEntries(mats.map((m) => [m.id, m.version])), version, generatedAt: nowIso(), error: null };
}

/** Material mudou (nova versão) ou foi excluído depois que a seção foi gerada. */
export function isStale(sec: GuideSection, materials: PMaterial[]): boolean {
  return Object.entries(sec.materialVersions ?? {}).some(([id, v]) => materials.find((m) => m.id === id)?.version !== v);
}

const daysUntil = (date: string, now = new Date()) => Math.ceil((new Date(date + 'T00:00:00').getTime() - new Date(now.toDateString()).getTime()) / 864e5);

export function GuideNew({ disciplineId, go }: { disciplineId: string; go: (to: string) => void }) {
  const p = usePersonal();
  const { status } = useAiStatus();
  const { items: disciplines } = useCollection('disciplines');
  const { items: allTopics } = useCollection('topics');
  const { items: allMaterials } = useCollection('materials');
  const { items: guides } = useCollection('guides');
  const d = disciplines.find((x) => x.id === disciplineId);
  const topics = allTopics.filter((t) => t.disciplineId === disciplineId).sort((a, b) => a.position - b.position);
  const materials = allMaterials.filter((m) => m.disciplineId === disciplineId);
  const [title, setTitle] = useState('');
  const [matIds, setMatIds] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [topicsConfirmed, setTopicsConfirmed] = useState(false);
  const [kinds, setKinds] = useState<SectionKind[] | null>(null);
  const [exam, setExam] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [scopeMat, setScopeMat] = useState('');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [complement, setComplement] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const aiOn = status.kind === 'on';
  const chosenKinds = kinds ?? (aiOn ? (['resumo', 'conceitos', 'exemplos'] as SectionKind[]) : []);
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  if (!d) return <p className="muted" role="status">Carregando…</p>;

  const pickMaterial = (m: PMaterial) => {
    const next = toggle(matIds, m.id);
    setMatIds(next);
    // sugere os assuntos associados aos materiais escolhidos — o estudante confirma; nada entra sozinho
    const suggested = new Set(materials.filter((x) => next.includes(x.id)).flatMap((x) => x.topicIds));
    setTopicIds(topics.filter((t) => suggested.has(t.id)).map((t) => t.id));
    setTopicsConfirmed(false);
    setScopeConfirmed(false);
  };

  const create = async () => {
    setErr(null);
    if (!matIds.length) return setErr('Escolha ao menos um material pronto.');
    if (!topicIds.length) return setErr('Escolha ao menos um assunto.');
    if (!topicsConfirmed) return setErr('Confirme os assuntos do guia.');
    if (exam && !examDate) return setErr('Informe a data da avaliação.');
    if (exam && !scopeConfirmed) return setErr('Confirme o escopo da avaliação.');
    if (guides.length >= LIMITS.guides) return setErr(`Limite de ${LIMITS.guides} guias atingido.`);
    setBusy(true);
    try {
      const mats = materials.filter((m) => matIds.includes(m.id));
      const pages = await sourcePages(p.repo, mats);
      const sections: Record<string, GuideSection> = {};
      for (const t of topics.filter((x) => topicIds.includes(x.id))) {
        sections[`${t.id}:trechos`] = trechos(t, pages, mats);
        for (const k of chosenKinds) sections[`${t.id}:${k}`] = { key: `${t.id}:${k}`, topicId: t.id, kind: k, status: 'pendente' };
      }
      const now = nowIso();
      const g: PGuide = {
        id: newId(), disciplineId: d.id, title: (title.trim() || `Guia — ${d.name}`).slice(0, 120), materialIds: matIds, topicIds, allowComplement: complement,
        exam: exam ? { date: examDate, ...(scopeMat ? { scopeMaterialId: scopeMat } : {}), confirmedAt: now } : null,
        sectionKinds: chosenKinds, sections, version: 1, createdAt: now, updatedAt: now,
      };
      await p.save('guides', g);
      go(`#/guia?id=${g.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chosenTopics = topics.filter((t) => topicIds.includes(t.id));
  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/disciplina?id=${d.id}`)}><ArrowLeft size={18} aria-hidden="true" /> {d.name}</button>
      <h1 className="screen-title">Novo guia de estudo</h1>
      <p className="sub">O guia é montado a partir dos seus materiais. Você confirma os assuntos antes; nada é acrescentado sozinho.</p>
      <form className="form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="field">
          <span>Título <small>· opcional</small></span>
          <input value={title} maxLength={120} placeholder={`Guia — ${d.name}`} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <fieldset className="fs">
          <legend>1. Materiais</legend>
          {materials.length === 0 ? (
            <p className="muted">Adicione um material na disciplina primeiro.</p>
          ) : (
            <ul className="pick-list">
              {materials.map((m) => (
                <li key={m.id}>
                  <label className="check-row">
                    <input type="checkbox" disabled={m.status !== 'pronto'} checked={matIds.includes(m.id)} onChange={() => pickMaterial(m)} />
                    <span>{m.title} {m.status !== 'pronto' && <><StatusBadge status={m.status} /><small> · precisa estar “Pronto”</small></>}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset className="fs">
          <legend>2. Assuntos do guia</legend>
          {topics.length === 0 ? (
            <p className="muted">Cadastre os assuntos na página da disciplina (ou adicione os sugeridos pelo material).</p>
          ) : (
            <>
              <p className="hint">Marcados: os associados aos materiais escolhidos. Ajuste e confirme.</p>
              <ul className="chips">
                {topics.map((t) => (
                  <li key={t.id}><button type="button" className={'chip' + (topicIds.includes(t.id) ? ' on' : '')} aria-pressed={topicIds.includes(t.id)} onClick={() => { setTopicIds(toggle(topicIds, t.id)); setTopicsConfirmed(false); setScopeConfirmed(false); }}>{t.name}</button></li>
                ))}
              </ul>
              <label className="check-row">
                <input type="checkbox" checked={topicsConfirmed} disabled={!topicIds.length} onChange={(e) => setTopicsConfirmed(e.target.checked)} />
                <span>Confirmo: o guia trata só de {chosenTopics.length ? chosenTopics.map((t) => t.name).join(', ') : '(nenhum assunto marcado)'}.</span>
              </label>
            </>
          )}
        </fieldset>

        <fieldset className="fs">
          <legend>3. Seções</legend>
          <p className="hint">“{SECTION_LABEL.trechos}” entra sempre: são parágrafos do material que mencionam o assunto, com a página, sem reescrita e sem IA.</p>
          <ul className="chips">
            {SECTION_KINDS.map((k) => (
              <li key={k}><button type="button" className={'chip' + (chosenKinds.includes(k) ? ' on' : '')} aria-pressed={chosenKinds.includes(k)} onClick={() => setKinds(toggle(chosenKinds, k))}>{SECTION_LABEL[k]}</button></li>
            ))}
          </ul>
          <p className={aiOn ? 'hint' : 'muted'}>{aiOn ? 'Essas seções são geradas por IA, uma por vez, quando você pedir no guia.' : `Essas seções usam IA: ${aiStatusText(status)} Se marcar, ficam pendentes até a geração estar disponível.`}</p>
          <label className="check-row">
            <input type="checkbox" checked={complement} onChange={(e) => setComplement(e.target.checked)} />
            <span>Permitir complemento além do material <small>· desligado: só entra o que tem trecho do seu material. Ligado: itens sem trecho aparecem marcados como “Complemento — fora do seu material”.</small></span>
          </label>
        </fieldset>

        <fieldset className="fs">
          <legend>4. Avaliação <small className="muted">· opcional</small></legend>
          <label className="check-row">
            <input type="checkbox" checked={exam} onChange={(e) => { setExam(e.target.checked); setScopeConfirmed(false); }} />
            <span>Este guia é para uma prova ou avaliação</span>
          </label>
          {exam && (
            <>
              <label className="field compact">
                <span>Data da avaliação</span>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </label>
              <label className="field">
                <span>Material com o conteúdo da prova <small>· opcional (ex.: texto colado com a lista de conteúdos)</small></span>
                <select value={scopeMat} onChange={(e) => setScopeMat(e.target.value)}>
                  <option value="">Nenhum</option>
                  {materials.filter((m) => matIds.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </label>
              <p className="hint">{NOT_A_PREDICTION}</p>
              <label className="check-row">
                <input type="checkbox" checked={scopeConfirmed} disabled={!topicIds.length} onChange={(e) => setScopeConfirmed(e.target.checked)} />
                <span>Confirmo que o escopo da avaliação é: {chosenTopics.map((t) => t.name).join(', ') || '(nenhum assunto marcado)'}.</span>
              </label>
            </>
          )}
        </fieldset>
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="row wrap">
          <button type="button" className="ghost" onClick={() => go(`#/disciplina?id=${d.id}`)}>Cancelar</button>
          <button type="submit" className="primary" disabled={busy}><BookOpen size={16} aria-hidden="true" /> Criar guia</button>
        </div>
      </form>
    </>
  );
}

export function GuidePage({ id, go }: { id: string; go: (to: string) => void }) {
  const p = usePersonal();
  const ai = useAiStatus();
  const { items: guides, loading } = useCollection('guides');
  const { items: allTopics } = useCollection('topics');
  const { items: allMaterials } = useCollection('materials');
  const g = guides.find((x) => x.id === id);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading) return <p className="muted" role="status">Carregando…</p>;
  if (!g) {
    return (
      <section className="empty">
        <h1 className="screen-title">Guia não encontrado</h1>
        <p className="sub">Ele pode ter sido excluído (por exemplo, junto com um material) ou pertencer a outro espaço.</p>
        <button type="button" className="primary" onClick={() => go('#/disciplinas')}>Ver suas disciplinas</button>
      </section>
    );
  }
  const mats = allMaterials.filter((m) => g.materialIds.includes(m.id));
  const missing = g.materialIds.length - mats.length;
  const topics = g.topicIds.map((tid) => allTopics.find((t) => t.id === tid)).filter((t): t is PTopic => !!t);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusyKey(key);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      await p.load('guides');
    } finally {
      setBusyKey(null);
    }
  };

  const refreshTrechos = (t: PTopic, sec?: GuideSection) =>
    run(`${t.id}:trechos`, async () => {
      const pages = await sourcePages(p.repo, mats);
      await p.repo.setGuideSection(g.id, `${t.id}:trechos`, trechos(t, pages, mats, (sec?.version ?? 0) + 1));
      await p.load('guides');
      return 'Trechos atualizados a partir da versão atual do material. A versão anterior fica guardada.';
    });

  const generate = (t: PTopic, kind: SectionKind, sec?: GuideSection) =>
    run(`${t.id}:${kind}`, async () => {
      if (!ai.client) throw new Error(aiStatusText(ai.status));
      const sb = await ai.client();
      const r = await requestGeneration(sb, { op: 'secao', guideId: g.id, topicId: t.id, kind, regenerar: sec?.status === 'pronta' });
      if (r.job?.status === 'running') {
        await p.load('guides');
        const j = await waitJob(sb, r.job.id);
        await p.load('guides');
        if (j.status === 'failed') throw new Error(j.error ?? 'A geração falhou. O conteúdo anterior da seção foi mantido.');
      } else await p.load('guides');
      return r.reused ? 'Esta seção já estava gerada com o material atual.' : `${SECTION_LABEL[kind]} de “${t.name}” pronta.${sec?.status === 'pronta' ? ' A versão anterior fica guardada.' : ''}`;
    });

  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/disciplina?id=${g.disciplineId}`)}><ArrowLeft size={18} aria-hidden="true" /> Disciplina</button>
      <h1 className="screen-title">{g.title}</h1>
      <p className="sub">{plural(topics.length, 'assunto', 'assuntos')} · {mats.map((m) => m.title).join(', ') || 'sem materiais'}{missing > 0 ? ` · ${plural(missing, 'material excluído', 'materiais excluídos')}` : ''} · complemento {g.allowComplement ? 'permitido (marcado)' : 'desligado'}</p>
      {g.exam && (
        <section className="panel exam-box" aria-label="Avaliação">
          <p><CalendarDays size={16} aria-hidden="true" /> <b>Avaliação em {new Date(g.exam.date + 'T00:00:00').toLocaleDateString('pt-BR')}</b>{(() => { const n = daysUntil(g.exam.date); return n > 0 ? ` · faltam ${plural(n, 'dia', 'dias')}` : n === 0 ? ' · é hoje' : ' · já passou'; })()}</p>
          <p className="hint">Escopo confirmado por você: {topics.map((t) => t.name).join(', ')}. {NOT_A_PREDICTION}</p>
        </section>
      )}
      <p className={ai.status.kind === 'on' ? 'hint' : 'muted'} role="status">{aiStatusText(ai.status)}</p>

      {topics.map((t, i) => (
        <section key={t.id} className="panel guide-topic" aria-labelledby={'h-gt-' + t.id}>
          <details open={i === 0}>
            <summary><h2 id={'h-gt-' + t.id}>{t.name}</h2></summary>
            {(['trechos', ...g.sectionKinds] as (SectionKind | 'trechos')[]).map((k) => {
              const key = `${t.id}:${k}`;
              const sec = g.sections[key];
              return (
                <SectionView
                  key={key}
                  kind={k}
                  sec={sec}
                  materials={allMaterials}
                  ai={ai.status}
                  busy={busyKey === key || sec?.status === 'gerando'}
                  disabled={!!busyKey}
                  onRun={() => void (k === 'trechos' ? refreshTrechos(t, sec) : generate(t, k, sec))}
                />
              );
            })}
          </details>
        </section>
      ))}
      {topics.length < g.topicIds.length && <p className="muted">Algum assunto deste guia foi removido da disciplina.</p>}

      <section className="panel" aria-labelledby="h-gdel">
        <div className="panel-head"><h2 id="h-gdel">Excluir guia</h2></div>
        {confirmDelete ? (
          <div className="confirm" role="alertdialog" aria-label="Excluir guia">
            <p>Excluir este guia e todas as seções (incluindo as versões anteriores)? Os materiais e as questões continuam.</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button type="button" className="danger" onClick={() => void run('del', async () => { await p.removeIds('guides', [g.id]); go(`#/disciplina?id=${g.disciplineId}`); return 'Guia excluído.'; })}>Excluir</button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-btn danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} aria-hidden="true" /> Excluir guia</button>
        )}
      </section>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </>
  );
}

function SectionView({ kind, sec, materials, ai, busy, disabled, onRun }: { kind: SectionKind | 'trechos'; sec?: GuideSection; materials: PMaterial[]; ai: AiStatus; busy: boolean; disabled: boolean; onRun: () => void }) {
  const [showPrev, setShowPrev] = useState(false);
  const status = sec?.status ?? 'pendente';
  const stale = !!sec && status === 'pronta' && isStale(sec, materials);
  const canRun = kind === 'trechos' || ai.kind === 'on';
  const label = kind === 'trechos' ? (status === 'pronta' ? 'Atualizar trechos' : 'Buscar trechos') : status === 'pronta' ? 'Regenerar esta seção' : status === 'falhou' ? 'Tentar de novo' : 'Gerar';
  return (
    <div className={'guide-sec st-' + status}>
      <div className="panel-head sub-head">
        <h3>{SECTION_LABEL[kind]}{kind !== 'trechos' && <small className="muted"> · IA</small>}</h3>
        <span className="row wrap">
          {sec?.version ? <small className="muted">v{sec.version}</small> : null}
          {stale && <span className="q-badge b-warn"><AlertTriangle size={12} aria-hidden="true" /> material mudou</span>}
        </span>
      </div>
      {busy ? (
        <p className="hint" role="status">Gerando… o restante do guia continua como está.</p>
      ) : status === 'pendente' ? (
        <p className="muted">{kind === 'trechos' ? 'Ainda sem trechos.' : canRun ? 'Ainda não gerada.' : 'Pendente: geração por IA indisponível agora (veja o aviso no topo).'}</p>
      ) : null}
      {sec?.error && <p className="form-error">{sec.error}</p>}
      {stale && <p className="hint">O material foi alterado ou excluído depois desta versão. {kind === 'trechos' ? 'Atualize os trechos' : 'Regenere a seção'} para usar o texto atual.</p>}
      {sec?.items && <Items items={sec.items} materials={materials} quotes={kind !== 'trechos'} empty={kind === 'trechos' ? 'Nenhum parágrafo do material menciona este assunto pelo nome. Confira o nome do assunto ou o material.' : 'Sem itens.'} />}
      {sec?.dropped ? <p className="src-meta">{plural(sec.dropped, 'item descartado', 'itens descartados')} por não ter trecho conferido no material.</p> : null}
      {sec?.generator === 'ia' && <p className="src-meta">Gerada por IA{sec.generatedAt ? ` em ${new Date(sec.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''} · cada item cita trechos conferidos no material · sem revisão humana.</p>}
      <div className="row wrap">
        {canRun && !busy && <button type="button" className="ghost" disabled={disabled} onClick={onRun}>{kind === 'trechos' ? <RefreshCw size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} {label}</button>}
        {sec?.previous?.items && <button type="button" className="text-btn" aria-expanded={showPrev} onClick={() => setShowPrev((x) => !x)}><History size={14} aria-hidden="true" /> {showPrev ? 'Ocultar' : 'Ver'} versão anterior{sec.previous.version ? ` (v${sec.previous.version})` : ''}</button>}
      </div>
      {showPrev && sec?.previous?.items && (
        <div className="prev-version">
          <p className="src-meta">Versão anterior{sec.previous.generatedAt ? `, de ${new Date(sec.previous.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}:</p>
          <Items items={sec.previous.items} materials={materials} quotes={kind !== 'trechos'} empty="Sem itens." />
        </div>
      )}
    </div>
  );
}

function Items({ items, materials, quotes, empty }: { items: GuideItem[]; materials: PMaterial[]; quotes: boolean; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="guide-items">
      {items.map((it, i) => (
        <li key={i} className={it.complement ? 'complement' : ''}>
          <b>{it.title}</b>
          {it.complement && <span className="q-badge b-warn">Complemento — fora do seu material</span>}
          <RichText as="div" className="guide-text" text={it.text} />
          {it.steps.length > 0 && <ol>{it.steps.map((s, j) => <li key={j}><RichText text={s} /></li>)}</ol>}
          {it.refs.length > 0 && (
            <ul className="sources">
              {it.refs.map((r, j) => {
                const m = materials.find((x) => x.id === r.materialId);
                return (
                  <li key={j}>
                    <small><Check size={12} aria-hidden="true" /> {m?.title ?? 'Material excluído'} — {m?.kind === 'texto' ? 'trecho' : 'página'} {r.page}</small>
                    {quotes && <blockquote className="ref-quote">“{r.quote}”</blockquote>}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
