// Área de trabalho do Web Lab e do React Lab (o Core cuida de enunciado, dicas, histórico, explicação e sessão).
// O código do estudante só roda dentro do iframe isolado (sandbox.ts); esta página monta o documento, mostra a prévia,
// o console e os testes. No celular os painéis viram abas; em telas largas ficam lado a lado.
import { CheckCheck, CheckCircle2, Play, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { LabPageProps } from '../registry';
import type { LabGrade } from '../types';
import { loadReactTools, type ReactTools } from './compile';
import { runWebTests } from './runner';
import { buildPage, readSandboxMessage, SANDBOX_ATTR, type BuiltPage } from './sandbox';
import type { WebFileName, WebLabExercise } from './types';

type Entry = { id: number; level: 'log' | 'info' | 'warn' | 'error' | 'blocked'; text: string };
type Panel = 'codigo' | 'previa' | 'console' | 'testes';
const WIDTHS = { celular: 360, tablet: 768, total: 0 } as const;
const MAX_ENTRIES = 200;
const MAX_FILE = 60_000;

function useWide(query = '(min-width: 1000px)') {
  const [wide, setWide] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return wide;
}

const LANG: Record<WebFileName, string> = { 'index.html': 'HTML', 'style.css': 'CSS', 'script.js': 'JavaScript', 'App.jsx': 'JSX' };

export default function WebLab({ exercise, initialDraft, saveDraft, clearDraft, recordAttempt, completed }: LabPageProps<WebLabExercise>) {
  const isReact = exercise.kind === 'react';
  const names = Object.keys(exercise.files) as WebFileName[];
  const [files, setFiles] = useState<Record<string, string>>(() => {
    const saved = initialDraft?.files ?? {};
    return Object.fromEntries(names.map((n) => [n, exercise.editable.includes(n) && typeof saved[n] === 'string' ? saved[n] : (exercise.files[n] ?? '')]));
  });
  const [active, setActive] = useState<WebFileName>(exercise.editable[0]);
  const [panel, setPanel] = useState<Panel>('codigo');
  const wide = useWide();
  const [tools, setTools] = useState<{ state: 'idle' | 'loading' | 'ready' | 'error'; value?: ReactTools; detail?: string }>({ state: isReact ? 'loading' : 'idle' });
  const [preview, setPreview] = useState<{ srcdoc: string; nonce: string; key: number } | null>(null);
  const [closed, setClosed] = useState<null | 'hung' | 'navigated'>(null);
  const loads = useRef({ load: 0, ready: 0 });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [grade, setGrade] = useState<LabGrade | null>(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState<keyof typeof WIDTHS>('total');
  const [confirmReset, setConfirmReset] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const testHost = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const beat = useRef(0);

  const loadTools = useCallback(() => {
    if (!isReact) return;
    setTools({ state: 'loading' });
    loadReactTools().then(
      (value) => setTools({ state: 'ready', value }),
      (e) => setTools({ state: 'error', detail: (e as Error).message }),
    );
  }, [isReact]);
  useEffect(loadTools, [loadTools]);

  /** monta o documento do estudante (null enquanto o React Lab ainda carrega as ferramentas) */
  const build = useCallback(
    (nonce: string, current = files): BuiltPage | null => {
      let script = current['script.js'] ?? '';
      let compileError: BuiltPage['syntax'] = null;
      if (isReact) {
        if (!tools.value) return null;
        const out = tools.value.compile(current['App.jsx'] ?? '');
        if ('error' in out) compileError = out;
        else script = out.code;
      }
      const page = buildPage({
        exerciseId: exercise.id,
        version: exercise.version,
        nonce,
        html: current['index.html'] ?? '',
        css: current['style.css'] ?? '',
        script: compileError ? `console.error(${JSON.stringify(`Erro de sintaxe no App.jsx, linha ${compileError.line}, coluna ${compileError.column}: ${compileError.error}`)});` : script,
        exports: exercise.exports,
        react: isReact && !compileError ? { runtime: tools.value!.runtime } : undefined,
      });
      return compileError ? { ...page, syntax: compileError } : page;
    },
    [files, isReact, tools.value, exercise.id, exercise.version, exercise.exports],
  );

  const run = useCallback(() => {
    const nonce = crypto.randomUUID();
    const page = build(nonce);
    if (!page) return;
    setEntries([]);
    setClosed(null);
    beat.current = Date.now();
    setPreview({ srcdoc: page.srcdoc, nonce, key: ++seq.current });
    if (!wide) setPanel('previa');
  }, [build, wide]);

  // primeira prévia ao abrir (e quando as ferramentas do React terminam de carregar)
  const first = useRef(false);
  useEffect(() => {
    if (first.current || (isReact && tools.state !== 'ready')) return;
    first.current = true;
    const nonce = crypto.randomUUID();
    const page = build(nonce);
    if (!page) return;
    beat.current = Date.now();
    setPreview({ srcdoc: page.srcdoc, nonce, key: ++seq.current });
  }, [build, isReact, tools.state]);

  // mensagens da prévia: só deste iframe e desta execução
  const previewShown = wide || panel === 'previa';
  useEffect(() => {
    if (!preview) return;
    const expect = { nonce: preview.nonce, exerciseId: exercise.id, version: exercise.version };
    let n = 0;
    const add = (level: Entry['level'], text: string) => setEntries((xs) => (xs.length >= MAX_ENTRIES ? xs : [...xs, { id: ++n, level, text }]));
    loads.current = { load: 0, ready: 0 };
    const onMessage = (e: MessageEvent) => {
      const m = readSandboxMessage(e, frame.current?.contentWindow, expect);
      if (!m) return;
      beat.current = Date.now();
      if (m.type === 'ready') loads.current.ready++;
      if (m.type === 'console') add(m.level, m.text);
      else if (m.type === 'error') add('error', m.line ? `${isReact ? 'App.jsx' : 'script.js'}:${m.line} — ${m.message}` : m.message);
      else if (m.type === 'blocked') add('blocked', `Bloqueado: ${m.uri || m.directive} — o laboratório não acessa a internet nem outros sites.`);
    };
    addEventListener('message', onMessage);
    // watchdog: com a prévia visível, 6 s sem batimento descartam o iframe (laço que escapou da proteção)
    beat.current = Date.now();
    const iv = previewShown
      ? setInterval(() => {
          if (document.visibilityState === 'visible' && Date.now() - beat.current > 6000) {
            setClosed('hung');
            setPreview(null);
          }
        }, 1000)
      : undefined;
    return () => {
      removeEventListener('message', onMessage);
      clearInterval(iv);
    };
  }, [preview, previewShown, exercise.id, exercise.version, isReact]);

  const edit = (name: WebFileName, value: string) => {
    const next = { ...files, [name]: value };
    setFiles(next);
    saveDraft({ files: Object.fromEntries(exercise.editable.map((n) => [n, next[n] ?? ''])) });
  };

  const verify = async () => {
    if (busy || !testHost.current) return;
    setBusy(true);
    try {
      const snapshot = files;
      const g = await runWebTests({ exerciseId: exercise.id, version: exercise.version, build: (nonce) => build(nonce, snapshot)! }, exercise.tests, testHost.current);
      setGrade(g);
      if (!wide) setPanel('testes');
      await recordAttempt(g);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    }
  };

  const ready = !isReact || tools.state === 'ready';
  const errors = entries.filter((e) => e.level === 'error' || e.level === 'blocked').length;
  const tabs: { id: Panel; label: string }[] = useMemo(
    () => [
      { id: 'codigo', label: 'Código' },
      { id: 'previa', label: 'Prévia' },
      { id: 'console', label: errors ? `Console (${errors})` : 'Console' },
      { id: 'testes', label: grade ? `Testes ${grade.results.filter((r) => r.passed).length}/${grade.results.length}` : 'Testes' },
    ],
    [errors, grade],
  );
  const show = (p: Panel) => wide || panel === p;

  return (
    <div className={'web-lab' + (wide ? ' wide' : '')}>
      <p className="muted small web-note">
        {isReact ? 'React 19 com JSX, transformado e executado no seu aparelho.' : 'HTML, CSS e JavaScript.'} O código roda numa página isolada: sem internet e sem acesso aos seus dados do Study Mastery.
      </p>
      {isReact && tools.state === 'loading' && <p className="muted" role="status">Preparando o React…</p>}
      {isReact && tools.state === 'error' && (
        <div className="notice" role="alert">
          <span>Não foi possível carregar o React deste laboratório. Se for a primeira abertura, ele precisa de conexão para ser baixado. ({tools.detail})</span>
          <button type="button" className="text-btn" onClick={loadTools}>Tentar de novo</button>
        </div>
      )}

      {!wide && (
        <div className="web-panels" role="tablist" aria-label="Áreas do laboratório">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" id={`web-tab-${t.id}`} aria-selected={panel === t.id} aria-controls={`web-panel-${t.id}`} className={'chip' + (panel === t.id ? ' on' : '')} onClick={() => setPanel(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="web-grid">
        <section className="panel web-code" id="web-panel-codigo" role={wide ? undefined : 'tabpanel'} aria-labelledby={wide ? 'h-web-code' : 'web-tab-codigo'} hidden={!show('codigo')}>
          <h2 id="h-web-code" className={wide ? 'web-h' : 'sr-only'}>Código</h2>
          <div className="web-files" role="tablist" aria-label="Arquivos">
            {names.map((n) => (
              <button key={n} type="button" role="tab" id={`web-file-${n}`} aria-selected={active === n} aria-controls="web-editor-panel" className={'web-file' + (active === n ? ' on' : '')} onClick={() => setActive(n)}>
                {n}
                {!exercise.editable.includes(n) && <small> (leitura)</small>}
              </button>
            ))}
          </div>
          <div id="web-editor-panel" role="tabpanel" aria-labelledby={`web-file-${active}`}>
            <label htmlFor="web-editor" className="sr-only">Editor de {active} ({LANG[active]})</label>
            <textarea
              id="web-editor"
              key={active}
              className="sql-editor web-editor"
              value={files[active] ?? ''}
              readOnly={!exercise.editable.includes(active)}
              onChange={(e) => edit(active, e.target.value)}
              onKeyDown={onKey}
              rows={14}
              maxLength={MAX_FILE}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-describedby="web-editor-help"
            />
            <p id="web-editor-help" className="muted small">{exercise.editable.includes(active) ? 'Ctrl+Enter executa. Seu código é salvo neste aparelho enquanto você digita.' : 'Arquivo de apoio, somente leitura.'}</p>
          </div>
          <div className="row wrap sql-actions">
            <button type="button" className="primary" onClick={run} disabled={!ready}><Play size={16} aria-hidden="true" /> Executar</button>
            <button type="button" className="ghost" onClick={() => void verify()} disabled={!ready || busy}><CheckCheck size={16} aria-hidden="true" /> {busy ? 'Verificando…' : 'Verificar resposta'}</button>
            {!confirmReset && <button type="button" className="text-btn" onClick={() => setConfirmReset(true)}><RotateCcw size={14} aria-hidden="true" /> Restaurar exercício</button>}
          </div>
          {confirmReset && (
            <div className="notice sql-confirm" role="group" aria-labelledby="web-confirm-text">
              <span id="web-confirm-text">Apagar o seu código e voltar aos arquivos iniciais? As tentativas já registradas continuam no histórico.</span>
              <span className="row wrap">
                <button type="button" className="ghost small" onClick={() => void clearDraft()}>Restaurar</button>
                <button type="button" className="text-btn" onClick={() => setConfirmReset(false)} autoFocus>Cancelar</button>
              </span>
            </div>
          )}
        </section>

        <section className="panel web-preview" id="web-panel-previa" role={wide ? undefined : 'tabpanel'} aria-labelledby={wide ? 'h-web-preview' : 'web-tab-previa'} hidden={!show('previa')}>
          <div className="panel-head">
            <h2 id="h-web-preview" className={wide ? 'web-h' : 'sr-only'}>Prévia</h2>
            <label className="web-width">
              <span>Largura</span>
              <select value={width} onChange={(e) => setWidth(e.target.value as keyof typeof WIDTHS)}>
                <option value="celular">Celular (360 px)</option>
                <option value="tablet">Tablet (768 px)</option>
                <option value="total">Largura disponível</option>
              </select>
            </label>
          </div>
          <div className="web-frame-wrap">
            {preview ? (
              <iframe
                key={preview.key}
                ref={frame}
                title="Prévia da sua página (isolada)"
                className="web-frame"
                sandbox={SANDBOX_ATTR}
                referrerPolicy="no-referrer"
                srcDoc={preview.srcdoc}
                onLoad={() => {
                  // documento carregado que não manda "ready" = o script navegou o iframe para outro endereço
                  // (a CSP não cobre isso): a prévia é encerrada
                  const n = ++loads.current.load;
                  const key = preview.key;
                  setTimeout(() => {
                    if (loads.current.ready < n && seq.current === key) {
                      setClosed('navigated');
                      setPreview(null);
                    }
                  }, 2000);
                }}
                style={WIDTHS[width] ? { width: `${WIDTHS[width]}px` } : undefined}
              />
            ) : (
              <p className="muted web-empty">{closed === 'hung'
                  ? 'A prévia parou de responder (laço infinito?) e foi encerrada. Corrija o código e toque em Executar.'
                  : closed === 'navigated'
                    ? 'A página saiu do laboratório (location.href ou envio para outro endereço) e a prévia foi encerrada. Links e navegação para fora não funcionam aqui.'
                    : 'Toque em Executar para ver a página.'}</p>
            )}
          </div>
        </section>

        <section className="panel web-console" id="web-panel-console" role={wide ? undefined : 'tabpanel'} aria-labelledby={wide ? 'h-web-console' : 'web-tab-console'} hidden={!show('console')}>
          <div className="panel-head">
            <h2 id="h-web-console" className={wide ? 'web-h' : 'sr-only'}>Console</h2>
            {entries.length > 0 && <button type="button" className="text-btn" onClick={() => setEntries([])}>Limpar</button>}
          </div>
          {entries.length === 0 ? (
            <p className="muted small">Mensagens de <code>console.log</code>, erros e bloqueios aparecem aqui.</p>
          ) : (
            <ol className="web-log" aria-live="polite">
              {entries.map((e) => (
                <li key={e.id} className={'lv-' + e.level}>
                  <span className="sr-only">{e.level === 'error' ? 'Erro: ' : e.level === 'warn' ? 'Aviso: ' : e.level === 'blocked' ? 'Bloqueio: ' : ''}</span>
                  {e.text}
                </li>
              ))}
            </ol>
          )}
          {entries.length >= MAX_ENTRIES && <p className="warn-text small">Limite de {MAX_ENTRIES} mensagens atingido.</p>}
        </section>

        <section className="panel web-tests" id="web-panel-testes" role={wide ? undefined : 'tabpanel'} aria-labelledby={wide ? 'h-web-tests' : 'web-tab-testes'} hidden={!show('testes')}>
          <h2 id="h-web-tests" className={wide ? 'web-h' : 'sr-only'}>Testes</h2>
          {grade ? (
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
              {grade.passed && <p className="ok-text small">Exercício concluído. A explicação está logo abaixo.</p>}
            </div>
          ) : (
            <>
              <p className="muted small">“Verificar resposta” roda estes testes, cada um numa página isolada nova:</p>
              <ul className="plain web-test-list">{exercise.tests.map((t) => <li key={t.id}>{t.label}</li>)}</ul>
            </>
          )}
          <p className="muted small">Os testes rodam no seu navegador e servem para aprender — não são uma avaliação à prova de fraude.</p>
          {completed && !grade && <p className="ok-text small"><CheckCircle2 size={14} aria-hidden="true" /> Você já concluiu este exercício.</p>}
        </section>
      </div>
      <div ref={testHost} className="web-test-host" aria-hidden="true" />
    </div>
  );
}
