// Área de trabalho do SQL Lab (o Core cuida de enunciado, dicas, histórico, explicação e sessão).
// Todo SQL roda no Web Worker; a página só mostra resultados. Fluxo em coluna única no celular; editor e resultado lado
// a lado em telas largas.
import { CheckCheck, CheckCircle2, Database, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { LabPageProps } from '../registry';
import type { LabGrade } from '../types';
import { acquireSqlRunner, releaseSqlRunner, sharedSqlRunner, SqlCancelledError, type SqlRunner } from './client';
import { SQL_LIMITS, type RunFailure, type RunOutput, type TableView } from './engine';
import { explainError } from './feedback';
import type { ResultSet, SqlLabExercise, SqlValue } from './types';

type Output = { kind: 'run'; result: RunOutput; ms: number } | { kind: 'fail'; message: string } | { kind: 'grade'; grade: LabGrade; ms: number };

const nf = new Intl.NumberFormat('pt-BR');

function Cell({ v }: { v: SqlValue }) {
  if (v === null) return <span className="sql-null">NULL</span>;
  return <>{typeof v === 'number' ? String(v) : v}</>;
}

function ResultTable({ result, caption }: { result: Pick<ResultSet, 'columns' | 'rows'>; caption: string }) {
  return (
    <div className="sql-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="sql-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{result.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} className={typeof v === 'number' ? 'num' : undefined}><Cell v={v} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataPanel({ exercise, runner, ready }: { exercise: SqlLabExercise; runner: SqlRunner; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<TableView[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !ready || tables) return;
    let live = true;
    runner.describe(exercise).then((t) => live && setTables(t)).catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [open, ready, tables, runner, exercise]);
  return (
    <details className="panel sql-data" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary><Database size={16} aria-hidden="true" /> Banco “{exercise.database}”: tabelas e dados do enunciado</summary>
      {!ready ? <p className="muted">Preparando o SQLite…</p> : error ? <p className="warn-text">Não foi possível ler o banco: {error}</p> : !tables ? <p className="muted" role="status">Lendo as tabelas…</p> : (
        <div className="sql-tables">
          {tables.map((t) => (
            <section key={t.name} className="sql-tview" aria-label={`Tabela ${t.name}`}>
              <h3><code>{t.name}</code> <small className="muted">{t.totalRows} {t.totalRows === 1 ? 'linha' : 'linhas'}</small></h3>
              <p className="sql-cols">
                {t.columns.map((c) => (
                  <span key={c.name} className="sql-col"><b>{c.name}</b> {c.type.toLowerCase()}{c.pk ? ' · chave primária' : ''}{c.notNull && !c.pk ? ' · obrigatório' : ''}</span>
                ))}
              </p>
              {t.rows.length ? <ResultTable result={{ columns: t.columns.map((c) => c.name), rows: t.rows }} caption={`Dados da tabela ${t.name}`} /> : <p className="muted small">Tabela vazia.</p>}
              {t.totalRows > t.rows.length && <p className="muted small">Mostrando {t.rows.length} de {t.totalRows} linhas.</p>}
            </section>
          ))}
        </div>
      )}
      <details className="src-details">
        <summary>SQL de criação das tabelas</summary>
        <pre className="sql-pre">{exercise.schemaSql}</pre>
      </details>
    </details>
  );
}

export default function SqlLab({ exercise, initialDraft, saveDraft, clearDraft, recordAttempt, completed }: LabPageProps<SqlLabExercise>) {
  const [sql, setSql] = useState(initialDraft?.sql ?? exercise.starterSql);
  const [runner] = useState(sharedSqlRunner);
  const [engine, setEngine] = useState<{ state: 'loading' | 'ready' | 'error'; detail?: string }>({ state: 'loading' });
  const [busy, setBusy] = useState<null | 'run' | 'grade'>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const resultHead = useRef<HTMLHeadingElement>(null);

  const start = useCallback(() => {
    setEngine({ state: 'loading' });
    runner.init().then(
      (v) => setEngine({ state: 'ready', detail: v }),
      (e) => setEngine({ state: 'error', detail: (e as Error).message }),
    );
  }, [runner]);
  useEffect(() => {
    acquireSqlRunner();
    start();
    return () => releaseSqlRunner();
  }, [start]);

  const show = (o: Output) => {
    setOutput(o);
    requestAnimationFrame(() => resultHead.current?.focus());
  };

  const failure = (e: unknown) => (e instanceof SqlCancelledError ? 'Execução cancelada.' : (e as Error).message);

  const run = async () => {
    if (busy) return;
    setBusy('run');
    try {
      const { result, ms } = await runner.run(exercise, sql);
      show(result.ok ? { kind: 'run', result, ms } : { kind: 'fail', message: explainError((result as RunFailure).message, (result as RunFailure).kind) });
    } catch (e) {
      show({ kind: 'fail', message: failure(e) });
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (busy) return;
    setBusy('grade');
    try {
      const { grade, ms } = await runner.grade(exercise, sql);
      show({ kind: 'grade', grade, ms });
      await recordAttempt(grade);
    } catch (e) {
      show({ kind: 'fail', message: failure(e) });
    } finally {
      setBusy(null);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void run();
    }
  };

  const ready = engine.state === 'ready';
  return (
    <div className="sql-lab">
      <section className="panel sql-dialect" aria-labelledby="h-sql-dialect">
        <h2 id="h-sql-dialect" className="sql-dialect-title">Dialeto deste laboratório: SQLite.</h2>
        <p className="muted small">
          O SQL roda no seu aparelho, num banco temporário recriado a cada execução — sem internet e sem acesso aos seus dados do Study Mastery.
          {exercise.portability === 'sql-comum' && ' A solução de referência deste exercício também foi conferida num banco da família MySQL (MariaDB 10.11 no modo do MySQL 8).'}
        </p>
        <details className="src-details">
          <summary>Diferenças para o MySQL 8 que podem aparecer</summary>
          <ul className="plain sql-diffs">
            <li><code>5 / 3</code> dá <b>1</b> no SQLite (divisão inteira) e <b>1.6667</b> no MySQL. Use <code>AVG</code> ou multiplique por <code>1.0</code>.</li>
            <li>Comparação de texto: no SQLite <code>'ana' = 'ANA'</code> é falso; no MySQL (colação padrão) é verdadeiro.</li>
            <li>Concatenação: <code>'a' || 'b'</code> funciona no SQLite; no MySQL use <code>CONCAT('a', 'b')</code>.</li>
            <li>Coluna fora do <code>GROUP BY</code>: o SQLite aceita; o MySQL 8 (ONLY_FULL_GROUP_BY) recusa.</li>
            <li>Funções de data como <code>CURDATE()</code> e <code>NOW()</code> são do MySQL; o SQLite usa <code>date('now')</code>.</li>
            <li>O SQLite aceita texto numa coluna INTEGER; o MySQL em modo estrito recusa. Autoincremento: <code>AUTOINCREMENT</code> (SQLite) × <code>AUTO_INCREMENT</code> (MySQL).</li>
          </ul>
        </details>
      </section>

      <DataPanel exercise={exercise} runner={runner} ready={ready} />

      <div className="sql-work">
        <section className="panel sql-editor-panel" aria-labelledby="h-sql-editor">
          <div className="panel-head">
            <h2 id="h-sql-editor">Seu SQL</h2>
            <small className="muted">{nf.format(sql.length)} / {nf.format(SQL_LIMITS.maxSqlChars)}</small>
          </div>
          <label htmlFor="sql-editor" className="sr-only">Editor de SQL</label>
          <textarea
            id="sql-editor"
            className="sql-editor"
            value={sql}
            onChange={(e) => {
              setSql(e.target.value);
              saveDraft({ sql: e.target.value });
            }}
            onKeyDown={onKey}
            rows={9}
            maxLength={SQL_LIMITS.maxSqlChars}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-describedby="sql-editor-help"
          />
          <p id="sql-editor-help" className="muted small">Ctrl+Enter executa. “Executar” usa os dados do enunciado; “Verificar resposta” testa também outros bancos.</p>
          <div className="row wrap sql-actions">
            <button type="button" className="primary" onClick={() => void run()} disabled={!!busy || !ready}><Play size={16} aria-hidden="true" /> {busy === 'run' ? 'Executando…' : 'Executar'}</button>
            <button type="button" className="ghost" onClick={() => void verify()} disabled={!!busy || !ready}><CheckCheck size={16} aria-hidden="true" /> {busy === 'grade' ? 'Verificando…' : 'Verificar resposta'}</button>
            {busy && <button type="button" className="ghost" onClick={() => runner.cancel()}><Square size={14} aria-hidden="true" /> Cancelar</button>}
            {!busy && !confirmReset && <button type="button" className="text-btn" onClick={() => setConfirmReset(true)}><RotateCcw size={14} aria-hidden="true" /> Restaurar exercício</button>}
          </div>
          {confirmReset && (
            <div className="notice sql-confirm" role="group" aria-labelledby="sql-confirm-text">
              <span id="sql-confirm-text">Apagar o seu SQL e voltar ao código inicial? As tentativas já registradas continuam no histórico.</span>
              <span className="row wrap">
                <button type="button" className="ghost small" onClick={() => void clearDraft()}>Restaurar</button>
                <button type="button" className="text-btn" onClick={() => setConfirmReset(false)} autoFocus>Cancelar</button>
              </span>
            </div>
          )}
          <p className="sql-engine" role="status" aria-live="polite">
            {engine.state === 'loading' ? 'Preparando o SQLite…' : engine.state === 'error' ? '' : busy ? '' : `SQLite ${engine.detail} pronto.`}
          </p>
          {engine.state === 'error' && (
            <div className="notice" role="alert">
              <span>Não foi possível iniciar o SQLite neste navegador. Se for a primeira abertura, ele precisa de conexão para ser baixado. ({engine.detail})</span>
              <button type="button" className="text-btn" onClick={start}>Tentar de novo</button>
            </div>
          )}
        </section>

        <section className="panel sql-output" aria-labelledby="h-sql-out">
          <h2 id="h-sql-out" ref={resultHead} tabIndex={-1}>Resultado</h2>
          {!output && <p className="muted">Execute o SQL para ver o resultado aqui.</p>}
          {output?.kind === 'fail' && <p className="sql-error" role="alert"><XCircle size={16} aria-hidden="true" /> {output.message}</p>}
          {output?.kind === 'run' && <RunView out={output.result} ms={output.ms} />}
          {output?.kind === 'grade' && <GradeView grade={output.grade} />}
          {completed && output?.kind !== 'grade' && <p className="ok-text small"><CheckCircle2 size={14} aria-hidden="true" /> Você já concluiu este exercício.</p>}
        </section>
      </div>
    </div>
  );
}

function RunView({ out, ms }: { out: RunOutput; ms: number }) {
  if (!out.result) {
    return (
      <p className="muted">
        {out.statements === 0
          ? 'Nada para executar: o editor só tem comentários.'
          : `${out.statements === 1 ? 'Comando executado' : `${out.statements} comandos executados`} em ${ms} ms. Linhas alteradas: ${out.changes}. Para ver o efeito, acrescente um SELECT no fim — o banco é descartado depois.`}
      </p>
    );
  }
  const r = out.result;
  return (
    <>
      <p className="muted small">
        {r.rows.length === 0 ? 'A consulta não devolveu linhas.' : `${nf.format(r.rows.length)} ${r.rows.length === 1 ? 'linha' : 'linhas'}`}
        {r.rows.length > 0 && ` · ${r.columns.length} ${r.columns.length === 1 ? 'coluna' : 'colunas'}`} · {ms} ms
      </p>
      {r.columns.length > 0 && <ResultTable result={r} caption="Resultado da consulta" />}
      {r.truncated && <p className="warn-text small">Mostrando só as primeiras {nf.format(SQL_LIMITS.maxRowsShown)} linhas.</p>}
    </>
  );
}

function GradeView({ grade }: { grade: LabGrade }) {
  return (
    <div className="sql-grade">
      <p className={grade.passed ? 'sql-verdict ok' : 'sql-verdict'} role="status">
        {grade.passed ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
        <b>{grade.passed ? 'Resposta correta!' : 'Ainda não.'}</b> {grade.summary}
      </p>
      <ul className="sql-tests">
        {grade.results.map((r) => (
          <li key={r.id} className={r.passed ? 'ok' : 'bad'}>
            <span className="sql-test-label">{r.passed ? <CheckCircle2 size={15} aria-label="aprovado" /> : <XCircle size={15} aria-label="não aprovado" />} {r.label}</span>
            {r.message && <span className="sql-test-msg">{r.message}</span>}
          </li>
        ))}
      </ul>
      {grade.passed && <p className="ok-text small">Exercício concluído. A explicação da solução está logo abaixo.</p>}
    </div>
  );
}
