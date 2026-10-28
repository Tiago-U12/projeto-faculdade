// @vitest-environment jsdom
// Página de exercício com um laboratório fictício: rascunho restaurado e "começar do zero", dicas graduais, tentativa no
// histórico, falha ao carregar o laboratório isolada (o resto do app continua) e navegação da sessão.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeBank } from '../../lib/bank';
import { StudyProvider } from '../../state';
import { resetCatalogCache } from '../catalog';
import { labStoreFor, resetLabStores, SESSION_KEY } from '../hooks';
import { LabPage } from '../LabPage';
import { LabsHub } from '../LabsHub';
import { LABS, type LabPageProps } from '../registry';
import { memoryLabStore } from '../storage';
import { ex } from './fixtures';

const bank = makeBank([], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 0 }, byDiscipline: {} });
const exercises = [ex('demo-001', { title: 'Primeiro desafio' }), ex('demo-002', { title: 'Segundo desafio', difficulty: 'medio' }), ex('demo-css', { topicIds: ['css'], skills: ['css.layout'], title: 'De CSS' })];

function DemoLab({ exercise, initialDraft, saveDraft, recordAttempt, completed }: LabPageProps) {
  return (
    <div>
      <label>Código <textarea defaultValue={initialDraft?.sql ?? 'inicial'} onChange={(e) => saveDraft({ sql: e.target.value })} /></label>
      <button type="button" onClick={() => void recordAttempt({ passed: true, score: 100, results: [{ id: 't', label: 'ok', passed: true }], summary: 'Tudo certo' })}>Verificar {exercise.id}</button>
      <output>{completed ? 'concluído' : 'pendente'}</output>
    </div>
  );
}

let failNext = false;
beforeEach(() => {
  resetCatalogCache();
  resetLabStores();
  failNext = false;
  LABS.splice(0, LABS.length, {
    kind: 'demo', name: 'Demo Lab', summary: 'teste', runtime: 'nenhum', offline: true,
    loadExercises: async () => exercises,
    loadPage: async () => {
      if (failNext) throw new Error('falha de rede simulada');
      return { default: DemoLab as never };
    },
  });
  // armazenamento em memória por espaço (o IndexedDB real é coberto em storage.test.ts)
  void labStoreFor('device', async (s) => memoryLabStore(s, true));
});
afterEach(() => {
  cleanup();
  LABS.splice(0, LABS.length);
  vi.useRealTimers();
});

const mount = (child: React.ReactNode) => render(<StudyProvider bank={bank} store={null}>{child}</StudyProvider>);

describe('página de exercício', () => {
  it('rascunho salvo com espera, restaurado ao voltar, e "começar do zero" apaga', async () => {
    const go = vi.fn();
    const first = mount(<LabPage id="demo-001" go={go} />);
    const area = await screen.findByLabelText('Código');
    fireEvent.change(area, { target: { value: 'SELECT 42;' } });
    await waitFor(() => expect(screen.getByText('Rascunho salvo neste aparelho.')).toBeInTheDocument(), { timeout: 2000 });
    first.unmount();
    mount(<LabPage id="demo-001" go={go} />);
    expect(await screen.findByText(/Rascunho restaurado/)).toBeInTheDocument();
    expect((await screen.findByLabelText('Código') as HTMLTextAreaElement).value).toBe('SELECT 42;');
    fireEvent.click(screen.getByRole('button', { name: /Começar do zero/ }));
    await waitFor(() => expect((screen.getByLabelText('Código') as HTMLTextAreaElement).value).toBe('inicial'));
    expect(screen.queryByText(/Rascunho restaurado/)).not.toBeInTheDocument();
  });

  it('dicas uma de cada vez; verificar registra tentativa, marca concluído e mostra a explicação', async () => {
    mount(<LabPage id="demo-001" go={vi.fn()} />);
    await screen.findByLabelText('Código');
    expect(screen.queryByText('Dica 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver a primeira dica' }));
    expect(screen.getByText('Dica 1')).toBeInTheDocument();
    expect(screen.queryByText('Dica 2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais uma dica' }));
    expect(screen.getByText('Dica 2')).toBeInTheDocument();
    expect(screen.queryByText('Explicação.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verificar demo-001' }));
    expect(await screen.findByText('Aprovado · 100%')).toBeInTheDocument();
    expect(screen.getByText('Explicação.')).toBeInTheDocument();
    expect(screen.getByText('concluído')).toBeInTheDocument();
  });

  it('laboratório que não carrega: aviso só nesta área, com nova tentativa', async () => {
    failNext = true;
    mount(<LabPage id="demo-001" go={vi.fn()} />);
    expect(await screen.findByText('Não foi possível abrir este laboratório')).toBeInTheDocument();
    expect(screen.getByText('Primeiro desafio')).toBeInTheDocument(); // o enunciado continua
    failNext = false; // a conexão voltou
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByLabelText('Código')).toBeInTheDocument();
  });

  it('exercício inexistente e sessão com "Próximo exercício"', async () => {
    const go = vi.fn();
    mount(<LabPage id="nao-existe" go={go} />);
    expect(await screen.findByText('Exercício não encontrado')).toBeInTheDocument();
    cleanup();
    const store = await labStoreFor('device');
    await store.setMeta(SESSION_KEY, { id: 'sess', exerciseIds: ['demo-001', 'demo-002'], index: 0, startedAt: 'x', filter: {} });
    mount(<LabPage id="demo-001" sessionId="sess" go={go} />);
    expect(await screen.findByText('Sessão prática · exercício 1 de 2')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Próximo exercício/ })));
    expect(go).toHaveBeenCalledWith('#/lab?id=demo-002&s=sess');
  });
});

describe('central dos laboratórios', () => {
  it('filtro estrito por assunto e sessão de 3 que fica menor quando faltam exercícios', async () => {
    const go = vi.fn();
    mount(<LabsHub disciplineId="fullstack" topicIds={['mysql']} go={go} />);
    expect(await screen.findByText('2 exercícios com estes filtros. A sessão prática terá 2 (não completamos com outros assuntos).')).toBeInTheDocument();
    expect(screen.queryByText('De CSS')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sessão prática (2)' })));
    const store = await labStoreFor('device');
    const session = await store.getMeta<{ exerciseIds: string[] }>(SESSION_KEY);
    expect(session!.exerciseIds.sort()).toEqual(['demo-001', 'demo-002']);
    expect(go.mock.calls[0][0]).toMatch(/^#\/lab\?id=demo-001&s=/);
  });

  it('sem nenhum exercício para os assuntos: diz isso claramente', async () => {
    mount(<LabsHub disciplineId="fullstack" topicIds={['react-router']} go={vi.fn()} />);
    expect(await screen.findByText(/Nenhum exercício prático com estes filtros/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exercício rápido' })).toBeDisabled();
  });
});
