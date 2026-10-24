import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { COLOR_LABEL, COLORS, LIMITS, validateDiscipline, type Color, type PDiscipline } from '../personal/types';

export interface DisciplineDraft {
  name: string;
  description: string;
  period: string;
  color: Color;
  /** só na criação: assuntos iniciais, um por linha */
  topics: string;
}

export function draftFrom(d?: PDiscipline, used: Color[] = []): DisciplineDraft {
  return { name: d?.name ?? '', description: d?.description ?? '', period: d?.period ?? '', color: d?.color ?? COLORS.find((c) => !used.includes(c)) ?? 'menta', topics: '' };
}

/** Formulário curto de disciplina: nome obrigatório; o resto é opcional. */
export function DisciplineForm({ initial, creating, busy, onSubmit, onCancel }: { initial: DisciplineDraft; creating: boolean; busy: boolean; onSubmit(d: DisciplineDraft): void; onCancel(): void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  const set = <K extends keyof DisciplineDraft>(k: K, v: DisciplineDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="panel form"
      aria-label={creating ? 'Nova disciplina' : 'Editar disciplina'}
      onSubmit={(e) => {
        e.preventDefault();
        const msg = validateDiscipline({ ...d, period: d.period.trim() });
        setErr(msg);
        if (!msg) onSubmit({ ...d, name: d.name.trim(), period: d.period.trim(), description: d.description.trim() });
      }}
    >
      <label className="field">
        <span>Nome</span>
        <input value={d.name} maxLength={LIMITS.disciplineName} required autoFocus onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Física I" />
      </label>
      <label className="field">
        <span>Período <small>(opcional)</small></span>
        <input value={d.period} maxLength={LIMITS.period} onChange={(e) => set('period', e.target.value)} placeholder="Ex.: 2026.2" />
      </label>
      <label className="field">
        <span>Descrição <small>(opcional)</small></span>
        <textarea value={d.description} maxLength={LIMITS.description} rows={2} onChange={(e) => set('description', e.target.value)} placeholder="Professor, horário, observações…" />
      </label>
      <fieldset className="swatches">
        <legend>Cor no calendário</legend>
        {COLORS.map((c) => (
          <label key={c} className={'swatch' + (d.color === c ? ' on' : '')} data-c={c}>
            <input type="radio" name={id + '-cor'} checked={d.color === c} onChange={() => set('color', c)} />
            <i aria-hidden="true">{d.color === c && <Check size={14} />}</i>
            <span>{COLOR_LABEL[c]}</span>
          </label>
        ))}
      </fieldset>
      {creating && (
        <label className="field">
          <span>Assuntos <small>(opcional, um por linha)</small></span>
          <textarea value={d.topics} rows={4} onChange={(e) => set('topics', e.target.value)} placeholder={'Limites\nDerivadas\nIntegrais'} />
          <small>Você também pode adicionar assuntos depois ou a partir dos materiais.</small>
        </label>
      )}
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="row wrap">
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Salvando…' : creating ? 'Criar disciplina' : 'Salvar alterações'}</button>
      </div>
    </form>
  );
}

/** Divide o texto de assuntos (um por linha) sem repetir nomes nem passar dos limites. */
export function parseTopicLines(text: string, existing: string[] = []): { names: string[]; error: string | null } {
  const seen = new Set(existing.map((n) => n.trim().toLocaleLowerCase('pt-BR')));
  const names: string[] = [];
  for (const raw of text.split('\n')) {
    const n = raw.trim().replace(/\s+/g, ' ');
    if (!n) continue;
    if (n.length > LIMITS.topicName) return { names: [], error: `Cada assunto pode ter até ${LIMITS.topicName} caracteres.` };
    const k = n.toLocaleLowerCase('pt-BR');
    if (seen.has(k)) continue;
    seen.add(k);
    names.push(n);
  }
  if (existing.length + names.length > LIMITS.topicsPerDiscipline) return { names: [], error: `Uma disciplina pode ter até ${LIMITS.topicsPerDiscipline} assuntos.` };
  return { names, error: null };
}
