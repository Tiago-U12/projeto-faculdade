// @vitest-environment jsdom
// Interface do SQL Lab dentro da página do Core, com o SQLite de verdade (sql.js) no lugar do worker: dialeto, executar,
// erros explicados, verificação com feedback por caso, tentativa no histórico, conclusão, rascunho, restaurar, dados,
// tempo esgotado e falha ao carregar o SQLite.
import 'fake-indexeddb/auto';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { makeBank } from '../../../lib/bank';
import { StudyProvider } from '../../../state';
import { resetCatalogCache } from '../../catalog';
import { labStoreFor, resetLabStores } from '../../hooks';
import { LabPage } from '../../LabPage';
import { memoryLabStore } from '../../storage';
import { configureEngine } from '../engine';
import { SQL_EXERCISES } from '../exercises';
import type { SqlLabExercise } from '../types';

const fake = vi.hoisted(() => ({ SQL: null as unknown as SqlJsStatic, mode: 'ok' as 'ok' | 'timeout' | 'init-fail' }));

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  const engine = await import('../engine');
  class EngineRunner {
    busy = false;
    async init() {
      if (fake.mode === 'init-fail') throw new Error('wasm indisponível');
      return '3.49.1';
    }
    async run(ex: SqlLabExercise, sql: string) {
      if (fake.mode === 'timeout') throw new actual.SqlTimeoutError(3000);
      return { result: engine.runExercise(fake.SQL, ex, sql), ms: 1 };
    }
    async grade(ex: SqlLabExercise, sql: string) {
      return { grade: engine.gradeExercise(fake.SQL, ex, sql), ms: 1 };
    }
    async describe(ex: SqlLabExercise) {
      return engine.describeExercise(fake.SQL, ex);
    }
    cancel() {}
  }
  return { ...actual, sharedSqlRunner: () => new EngineRunner(), acquireSqlRunner: () => undefined, releaseSqlRunner: () => undefined };
});

const bank = makeBank([], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 0 }, byDiscipline: {} });
const ID = 'sql-clientes-sem-cidade';
const starter = SQL_EXERCISES.find((e) => e.id === ID)!.starterSql;

beforeAll(async () => {
  fake.SQL = await initSqlJs();
  configureEngine(fake.SQL);
});
beforeEach(() => {
  fake.mode = 'ok';
  resetCatalogCache();
  resetLabStores();
  void labStoreFor('device', async (s) => memoryLabStore(s, true));
});
afterEach(cleanup);

const mount = () => render(<StudyProvider bank={bank} store={null}><LabPage id={ID} go={vi.fn()} /></StudyProvider>);
const editor = async () => (await screen.findByLabelText('Editor de SQL')) as HTMLTextAreaElement;
const type = async (sql: string) => fireEvent.change(await editor(), { target: { value: sql } });
const ready = () => screen.findByText('SQLite 3.49.1 pronto.');

describe('SQL Lab', () => {
  it('mostra o dialeto, executa no banco do enunciado e mostra NULL na tabela', async () => {
    mount();
    expect(await screen.findByText('Dialeto deste laboratório: SQLite.')).toBeInTheDocument();
    expect((await editor()).value).toBe(starter);
    await ready();
    await type('SELECT * FROM clientes WHERE id <= 2');
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    const table = await screen.findByRole('region', { name: 'Resultado da consulta' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['id', 'nome', 'cidade']);
    expect(within(table).getByText('NULL')).toBeInTheDocument();
    expect(screen.getByText(/^2 linhas/)).toBeInTheDocument();
    // Executar não conta como tentativa
    expect(screen.getByText(/Nenhuma verificação ainda/)).toBeInTheDocument();
  });

  it('erro de SQL vira orientação; Ctrl+Enter executa', async () => {
    mount();
    await ready();
    await type('SELEC nome FROM clientes');
    fireEvent.keyDown(await editor(), { key: 'Enter', ctrlKey: true });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Erro de sintaxe perto de "SELEC"/);
  });

  it('verificar: errado mostra feedback por caso e entra no histórico; certo conclui e mostra a explicação', async () => {
    mount();
    await ready();
    await type('SELECT id, nome FROM clientes WHERE cidade = NULL ORDER BY id');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar resposta' }));
    expect(await screen.findByText('Ainda não.')).toBeInTheDocument();
    expect(screen.getByText('Passou em 1 de 3 bancos de teste.', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(/use IS NULL/).length).toBeGreaterThan(0);
    expect(await screen.findByText('Ainda não · 33%')).toBeInTheDocument();
    expect(screen.queryByText(/NULL representa ausência de valor/)).not.toBeInTheDocument();

    await type('SELECT id, nome FROM clientes WHERE cidade IS NULL ORDER BY id');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar resposta' }));
    expect(await screen.findByText('Resposta correta!')).toBeInTheDocument();
    expect(await screen.findByText('Aprovado · 100%')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText(/NULL representa ausência de valor/)).toBeInTheDocument();
  });

  it('rascunho volta ao reabrir; "Restaurar exercício" pede confirmação e volta ao código inicial', async () => {
    const first = mount();
    await type('SELECT nome FROM clientes;');
    await waitFor(() => expect(screen.getByText('Rascunho salvo neste aparelho.')).toBeInTheDocument(), { timeout: 2000 });
    first.unmount();
    mount();
    await waitFor(async () => expect((await editor()).value).toBe('SELECT nome FROM clientes;'));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar exercício' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect((await editor()).value).toBe('SELECT nome FROM clientes;');
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar exercício' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(async () => expect((await editor()).value).toBe(starter));
  });

  it('aba de dados mostra tabelas, colunas e linhas do enunciado', async () => {
    mount();
    await ready();
    const summary = screen.getByText(/Banco “Loja”/);
    const details = summary.closest('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    const clientes = await screen.findByRole('region', { name: 'Tabela clientes' });
    expect(within(clientes).getByText('5 linhas')).toBeInTheDocument();
    expect(within(clientes).getByText('Bruno Lima')).toBeInTheDocument();
    expect(within(clientes).getByText(/chave primária/)).toBeInTheDocument();
  });

  it('tempo esgotado aparece como erro e a página continua utilizável', async () => {
    fake.mode = 'timeout';
    mount();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/passou de 3 s e foi interrompida/);
    expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled();
  });

  it('SQLite que não carrega: aviso, botões desligados e "Tentar de novo"', async () => {
    fake.mode = 'init-fail';
    mount();
    expect(await screen.findByText(/Não foi possível iniciar o SQLite/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Executar' })).toBeDisabled();
    fake.mode = 'ok';
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await ready();
    expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled();
  });
});
