// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { makeBank } from '../../lib/bank';
import { makeQ } from '../../lib/__tests__/fixtures';
import { buildSession } from '../../lib/engine';
import { emptyState, saveState, type AppState } from '../../lib/storage';
import { parseHash } from '../../lib/route';
import { StudyProvider, useStudy } from '../../state';
import type { Attempt, SessionConfig } from '../../types';
import { Results } from '../Results';
import { Setup } from '../Setup';
import { Progress } from '../Progress';

const fsQuestion = makeQ({ id: 'fs-old', topicId: 'html', disciplineId: 'fullstack', difficulty: 'dificil', scope: 'desafio', stem: 'Questão da tentativa antiga' });
const calcQuestion = makeQ({ id: 'c2-new', topicId: 'derivadas', stem: 'Questão da tentativa recente' });
const bank = makeBank([fsQuestion, calcQuestion], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 2 }, byDiscipline: {} });
const config: SessionConfig = { disciplineId: 'calculo2', topicIds: ['derivadas'], difficulties: ['facil'], scope: 'aula', mode: 'aprender', size: 5 };
const attempt = (id: string, q: typeof fsQuestion): Attempt => ({ id, date: '2026-10-23T10:00:00Z', disciplineId: q.disciplineId, mode: 'aprender', bankVersion: 'test', answers: [{ questionId: q.id, topicId: q.topicId, difficulty: q.difficulty, chosenOptionId: 'a', correct: false }] });
function Active() {
  const { state } = useStudy();
  return <output data-testid="active">{JSON.stringify(state.active)}</output>;
}
function mount(child: React.ReactNode, state: AppState) {
  localStorage.clear();
  saveState(localStorage, state);
  return render(<StudyProvider bank={bank} store={localStorage}>{child}<Active /></StudyProvider>);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('tentativas e sessão em andamento', () => {
  it('abre uma tentativa antiga pelo ID e refaz somente seus erros, apesar da última configuração ser outra', () => {
    const state = emptyState();
    state.attempts = [attempt('new', calcQuestion), attempt('old', fsQuestion)];
    state.settings.lastConfig = config;
    const go = vi.fn();
    mount(<Results attemptId="old" go={go} />, state);
    expect(screen.getByText('Questão da tentativa antiga', { selector: '.rv-full' })).toBeVisible();
    expect(screen.queryByText('Questão da tentativa recente')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refazer os 1 erro/ }));
    const active = JSON.parse(screen.getByTestId('active').textContent!);
    expect(active.session.config.disciplineId).toBe('fullstack');
    expect(active.session.config.scope).toBe('desafio');
    expect(active.session.items.map((i: { questionId: string }) => i.questionId)).toEqual(['fs-old']);
    expect(go).toHaveBeenCalledWith('#/quiz');
  });
  it('não substitui a tentativa ausente pela última e decodifica o ID da URL', () => {
    const state = emptyState();
    state.attempts = [attempt('new', calcQuestion)];
    mount(<Results attemptId="gone" go={() => {}} />, state);
    expect(screen.getByRole('heading', { name: 'Tentativa não encontrada neste aparelho' })).toBeVisible();
    expect(parseHash('#/results?id=old%2Fone')).toEqual({ name: 'results', id: 'old/one' });
  });
  it('cancelar preserva sessão e respostas; confirmar inicia outra sessão', () => {
    const state = emptyState();
    state.active = { session: buildSession([calcQuestion], config, { stats: {} }, 10), answers: { 'c2-new': 'a' }, index: 0, startedAt: '2026-10-23T10:00:00Z' };
    const go = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mount(<Setup route={{ name: 'setup' }} go={go} />, state);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(JSON.parse(screen.getByTestId('active').textContent!)).toEqual(state.active);
    expect(go).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(JSON.parse(screen.getByTestId('active').textContent!).answers).toEqual({});
    expect(go).toHaveBeenCalledWith('#/quiz');
  });
  it('o histórico aponta para cada tentativa e o botão de revisão usa erros da disciplina selecionada', () => {
    const state = emptyState();
    state.attempts = [attempt('old', fsQuestion)];
    state.stats['fs-old'] = { seen: 1, correct: 0, lastSeen: '2026-10-23', lastCorrect: false, box: 0, due: '2026-10-23' };
    mount(<Progress go={() => {}} />, state);
    fireEvent.click(screen.getByRole('button', { name: bank.taxonomy.disciplines.find((d) => d.id === 'fullstack')!.short, exact: true }));
    expect(screen.getByRole('link')).toHaveAttribute('href', '#/results?id=old');
    fireEvent.click(screen.getByRole('button', { name: 'Revisar meus erros' }));
    expect(JSON.parse(screen.getByTestId('active').textContent!).session.items.map((i: { questionId: string }) => i.questionId)).toEqual(['fs-old']);
  });
});
