// Ligações da agenda com o resto do app: disciplinas (pessoais e do banco existente), fuso, desempenho e links.
import { useEffect, useMemo } from 'react';
import { usePersonalOptional } from '../personal/context';
import type { Color, PEvent } from '../personal/types';
import { useStudy } from '../state';
import { deviceTimeZone, isValidTimeZone } from './time';

export interface CalDiscipline {
  id: string;
  name: string;
  color: Color;
  kind: 'pessoal' | 'banco';
  topics: { id: string; name: string }[];
}

const BANK_COLOR: Record<string, Color> = { calculo2: 'ceu', fullstack: 'lilas' };

export function useTimeZone(): [string, (tz: string) => void] {
  const { state, updateSettings } = useStudy();
  const tz = state.settings.timeZone && isValidTimeZone(state.settings.timeZone) ? state.settings.timeZone : deviceTimeZone();
  return [tz, (t: string) => isValidTimeZone(t) && updateSettings({ timeZone: t })];
}

/** Disciplinas que podem ter eventos: as suas (do espaço atual) e as do banco existente. */
export function useCatalog(): { list: CalDiscipline[]; get: (id: string) => CalDiscipline | undefined; loading: boolean } {
  const { bank } = useStudy();
  const p = usePersonalOptional();
  const ds = p?.items('disciplines');
  const ts = p?.items('topics');
  useEffect(() => {
    if (p && !ds) void p.load('disciplines');
    if (p && !ts) void p.load('topics');
  }, [p, ds, ts]);
  return useMemo(() => {
    const personal: CalDiscipline[] = (ds ?? []).map((d) => ({
      id: d.id, name: d.name, color: d.color, kind: 'pessoal',
      topics: (ts ?? []).filter((t) => t.disciplineId === d.id).sort((a, b) => a.position - b.position).map((t) => ({ id: t.id, name: t.name })),
    }));
    const fromBank: CalDiscipline[] = bank.taxonomy.disciplines.map((d) => ({ id: d.id, name: d.name, color: BANK_COLOR[d.id] ?? 'ardosia', kind: 'banco', topics: d.topics.map((t) => ({ id: t.id, name: t.name })) }));
    const list = [...personal, ...fromBank];
    const map = new Map(list.map((d) => [d.id, d]));
    return { list, get: (id: string) => map.get(id), loading: !!p && (!ds || !ts) };
  }, [bank, ds, ts, p]);
}

/** Respostas por assunto em todo o histórico deste espaço (banco existente e questões pessoais). */
export function usePerformance(): Record<string, { answered: number; correct: number }> {
  const { state } = useStudy();
  return useMemo(() => {
    const out: Record<string, { answered: number; correct: number }> = {};
    for (const a of state.attempts)
      for (const x of a.answers) {
        if (x.chosenOptionId === null) continue;
        const o = (out[x.topicId] ??= { answered: 0, correct: 0 });
        o.answered++;
        if (x.correct) o.correct++;
      }
    return out;
  }, [state.attempts]);
}

/** Endereço do conteúdo vinculado ao evento (guia, questões pessoais ou banco), com assuntos e modo. */
export function eventLinkHref(e: PEvent, d: CalDiscipline | undefined): { href: string; label: string } | null {
  const q = (base: string, mode?: string) => `${base}${e.topicIds.length ? `&t=${e.topicIds.join(',')}` : ''}${mode ? `&m=${mode}` : ''}`;
  const link = e.link ?? (d?.kind === 'banco' ? { kind: 'banco' as const } : d ? { kind: 'questoes' as const } : undefined);
  if (!link || link.kind === 'nenhum') return null;
  if (link.kind === 'guia') return { href: `#/guia?id=${link.guideId}`, label: 'Abrir guia' };
  if (link.kind === 'banco') return { href: q(`#/setup?d=${e.disciplineId}`, link.mode), label: 'Abrir questões do banco' };
  return { href: q(`#/questoes?d=${e.disciplineId}`, link.mode), label: link.mode === 'simulado' ? 'Abrir simulado' : 'Abrir questões' };
}
