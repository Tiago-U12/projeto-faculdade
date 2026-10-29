// Montagem da página isolada do Web Lab e validação das mensagens que ela envia.
//
// Isolamento (em camadas):
//  - <iframe sandbox="allow-scripts allow-forms"> SEM allow-same-origin: origem opaca — sem acesso ao DOM, ao
//    armazenamento (localStorage/IndexedDB/cookies) e ao service worker do Study Mastery; sem popups, sem navegar a
//    janela principal, sem alert/confirm (sem allow-modals). allow-forms existe só para o evento submit funcionar nos
//    exercícios de formulário: envio para outro endereço é barrado pelo CSP (form-action 'none'); envio sem
//    preventDefault é cancelado pelo harness (recarregaria a própria página isolada, o que o CSP não impede).
//  - CSP no próprio documento: nada de rede (connect/img/font/frame/worker/object), só scripts e estilos embutidos.
//  - Laços instrumentados (guard.ts) + harness com limite de tempo; watchdog por batimento na página.
//  - Mensagens: só aceitas da janela do iframe, de origem "null", com o nonce desta execução, o exercício, a versão e
//    o formato esperados. O código do estudante roda junto do harness e pode forjar mensagens: o resultado dos testes
//    é EDUCATIVO, não à prova de fraude.
import harnessSource from './harness.js?raw';
import { guardLoops, type GuardSyntaxError } from './guard';

export const SANDBOX_ATTR = 'allow-scripts allow-forms';
export const SANDBOX_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'none'";
/** tempo máximo de um laço sem devolver o controle ao navegador */
export const LOOP_MS = 1500;
const MARK = '/*__SM_SCRIPT__*/';

export interface PageInput {
  exerciseId: string;
  version: number;
  nonce: string;
  html: string;
  css: string;
  /** JavaScript já pronto para o navegador (no React: saída da transformação do JSX) */
  script: string;
  /** nomes que os testes chamam (funções do script) */
  exports?: string[];
  /** React: código do runtime (window.React/ReactDOM) e montagem do componente App */
  react?: { runtime: string };
}
export interface BuiltPage {
  srcdoc: string;
  /** erro de sintaxe no script (a página roda sem ele, e o console mostra o erro) */
  syntax: GuardSyntaxError | null;
}

const escapeScript = (s: string) => s.replace(/<\/(script)/gi, '<\\/$1');
const escapeStyle = (s: string) => s.replace(/<\/(style)/gi, '<\\/$1');
const isOwn = (href: string | null, name: string) => !!href && href.replace(/^\.\//, '').split(/[?#]/)[0] === name;

function reactGlue(): { before: string; after: string } {
  return {
    before:
      "(function(){var module={exports:{}};var exports=module.exports;var require=function(n){if(n==='react')return window.React;if(n==='react-dom/client'||n==='react-dom')return window.ReactDOM;throw new Error('Pacote não disponível no laboratório: '+n+'. Use apenas react.');};",
    after:
      ";var App=module.exports.default||module.exports.App;if(typeof App!=='function')throw new Error('Exporte o componente principal: export default function App() { … }');window.ReactDOM.createRoot(document.getElementById('root'),{onUncaughtError:function(e){console.error(e&&e.message?e.message:e);},onCaughtError:function(e){console.error(e&&e.message?e.message:e);}}).render(window.React.createElement(App));})();",
  };
}

/** Monta o documento (srcdoc) com CSP, harness, CSS e o script instrumentado do estudante. */
export function buildPage(p: PageInput): BuiltPage {
  const guarded = guardLoops(p.script);
  const syntax = 'error' in guarded ? guarded : null;
  const exportsTail = p.exports?.length
    ? `;try{window.__smExports={${p.exports.map((n) => `${JSON.stringify(n)}:typeof ${n}!=='undefined'?${n}:undefined`).join(',')}};}catch(e){}`
    : '';
  const doc = new DOMParser().parseFromString(p.html, 'text/html');
  const head = doc.head;

  // CSS do estudante no lugar do <link href="style.css"> (ou no fim do head)
  const style = doc.createElement('style');
  style.textContent = escapeStyle(p.css);
  const link = [...doc.querySelectorAll('link[rel~="stylesheet"]')].find((l) => isOwn(l.getAttribute('href'), 'style.css'));
  if (link) link.replaceWith(style);
  else head.append(style);

  // outros scripts embutidos no HTML também ganham a proteção de laço
  for (const s of doc.querySelectorAll('script:not([src])')) {
    const g = guardLoops(s.textContent ?? '');
    s.textContent = escapeScript('error' in g ? (s.textContent ?? '') : g.code);
  }

  const main = doc.createElement('script');
  const ref = [...doc.querySelectorAll('script[src]')].find((s) => isOwn(s.getAttribute('src'), p.react ? 'App.jsx' : 'script.js'));
  const body = syntax ? `console.error(${JSON.stringify(`Erro de sintaxe no ${p.react ? 'App.jsx' : 'script.js'}, linha ${syntax.line}, coluna ${syntax.column}: ${syntax.error}`)});` : (guarded as { code: string }).code;
  const glue = p.react && !syntax ? reactGlue() : { before: '', after: '' };
  main.textContent = escapeScript(`${glue.before}\n${MARK}\n${body}\n${exportsTail}${glue.after}`);
  // defer/module no original: o script embutido vai para o fim do body (roda com o DOM pronto, como o defer)
  if (ref && !ref.hasAttribute('defer') && ref.getAttribute('type') !== 'module') ref.replaceWith(main);
  else {
    ref?.remove();
    doc.body.append(main);
  }
  if (p.react) {
    const rt = doc.createElement('script');
    rt.textContent = escapeScript(p.react.runtime);
    main.before(rt);
  }

  // topo do head: charset, CSP e harness (antes de qualquer conteúdo do estudante)
  const meta = doc.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', SANDBOX_CSP);
  const charset = doc.createElement('meta');
  charset.setAttribute('charset', 'utf-8');
  const harness = doc.createElement('script');
  harness.textContent = '__SM_HARNESS__';
  head.prepend(charset, meta, harness);
  if (!doc.querySelector('meta[name="viewport"]')) {
    const vp = doc.createElement('meta');
    vp.setAttribute('name', 'viewport');
    vp.setAttribute('content', 'width=device-width, initial-scale=1');
    harness.after(vp);
  }

  let html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  const cfg = (scriptLine: number) =>
    escapeScript(harnessSource.replace('__SM_CONFIG__', JSON.stringify({ nonce: p.nonce, exerciseId: p.exerciseId, version: p.version, loopMs: LOOP_MS, scriptLine })));
  html = html.replace('__SM_HARNESS__', () => cfg(0));
  // linha (no documento) onde começa o código do estudante: erros são convertidos para a linha do editor
  const scriptLine = html.slice(0, html.indexOf(MARK)).split('\n').length + 1;
  html = html.replace(cfg(0), () => cfg(scriptLine));
  return { srcdoc: html, syntax };
}

// ---------- mensagens do sandbox ----------
export type SandboxMessage =
  | { type: 'ready' }
  | { type: 'beat' }
  | { type: 'console'; level: 'log' | 'info' | 'warn' | 'error'; text: string }
  | { type: 'error'; message: string; line: number | null }
  | { type: 'blocked'; uri: string; directive: string }
  | { type: 'result'; testId: string; passed: boolean; message: string | null };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : null);
const LEVELS = new Set(['log', 'info', 'warn', 'error']);

/** Aceita a mensagem só se vier deste iframe e desta execução, com o formato esperado. */
export function readSandboxMessage(e: Pick<MessageEvent, 'source' | 'origin' | 'data'>, frame: Window | null | undefined, expect: { nonce: string; exerciseId: string; version: number }): SandboxMessage | null {
  if (!frame || e.source !== frame || e.origin !== 'null') return null;
  const d = e.data;
  if (!isObj(d) || d.v !== 1 || d.nonce !== expect.nonce || d.exerciseId !== expect.exerciseId || d.version !== expect.version) return null;
  const p = d.payload;
  switch (d.type) {
    case 'ready':
    case 'beat':
      return { type: d.type };
    case 'console': {
      const text = isObj(p) ? str(p.text, 2000) : null;
      return text !== null && isObj(p) && LEVELS.has(p.level as string) ? { type: 'console', level: p.level as 'log', text } : null;
    }
    case 'error': {
      const message = isObj(p) ? str(p.message, 2000) : null;
      if (message === null || !isObj(p)) return null;
      const line = typeof p.line === 'number' && Number.isSafeInteger(p.line) && p.line > 0 ? p.line : null;
      return { type: 'error', message, line };
    }
    case 'blocked': {
      const uri = isObj(p) ? str(p.uri, 300) : null;
      return uri !== null && isObj(p) ? { type: 'blocked', uri, directive: str(p.directive, 60) ?? '' } : null;
    }
    case 'result': {
      if (!isObj(p) || typeof p.passed !== 'boolean') return null;
      const testId = str(p.testId, 100);
      if (testId === null) return null;
      return { type: 'result', testId, passed: p.passed, message: p.message === null ? null : str(p.message, 2000) };
    }
    default:
      return null;
  }
}
