// @vitest-environment jsdom
// Web Lab sem navegador real: proteção de laços (só insere texto, mantém linhas), montagem do documento isolado
// (CSP no topo, harness antes do código do estudante, CSS e script no lugar dos arquivos, escape de </script>) e
// validação das mensagens vindas do sandbox. A execução de verdade é testada no Chromium (tests/e2e/labs.ts).
import { describe, expect, it } from 'vitest';
import { exerciseProblems } from '../../catalog';
import { WEB_EXERCISES } from '../exercises';
import { guardLoops } from '../guard';
import { buildPage, LOOP_MS, readSandboxMessage, SANDBOX_ATTR, SANDBOX_CSP } from '../sandbox';

describe('guardLoops', () => {
  it('protege todo tipo de laço sem mudar o número de linhas', () => {
    const src = 'for (let i = 0; i < 3; i++) {\n  x();\n}\nwhile (a) b();\ndo { c(); } while (d);\nfor (const k in o) ;\nfor (const v of xs) for (;;) y();\n';
    const r = guardLoops(src);
    if ('error' in r) throw new Error(r.error);
    expect(r.loops).toBe(6);
    expect(r.code.split('\n').length).toBe(src.split('\n').length);
    expect(r.code).toContain('for (let i = 0; i < 3; i++) {__smLoop();');
    expect(r.code).toContain('while (a) {__smLoop();b();}');
    expect(r.code).toContain('do {__smLoop(); c(); } while (d);');
    expect(r.code).toContain('for (const k in o) {__smLoop();;}');
    expect(r.code).toContain('for (const v of xs) {__smLoop();for (;;) {__smLoop();y();}}');
    // o resultado continua sendo JavaScript válido
    expect('error' in guardLoops(r.code)).toBe(false);
  });

  it('erro de sintaxe vira mensagem com linha e coluna (nada é executado)', () => {
    expect(guardLoops('let a = ;\n')).toMatchObject({ line: 1, column: 9 });
    expect(guardLoops('function f() {\n  return 1\n')).toMatchObject({ line: 3 });
  });

  it('código sem laços fica igual', () => {
    expect(guardLoops('const a = [1, 2].map((x) => x * 2);')).toEqual({ code: 'const a = [1, 2].map((x) => x * 2);', loops: 0 });
  });
});

describe('buildPage', () => {
  const base = { exerciseId: 'web-x', version: 3, nonce: 'n-123' };
  const html = '<!DOCTYPE html><html><head><title>T</title><link rel="stylesheet" href="style.css"></head><body><p id="a">oi</p><script src="script.js"></script><script>while(true){}</script></body></html>';

  it('CSP e harness no topo; CSS e script no lugar dos arquivos; laços protegidos', () => {
    const { srcdoc, syntax } = buildPage({ ...base, html, css: 'p { color: red }', script: 'for (;;) {}\nconsole.log("</script><b>")', exports: ['soma'] });
    expect(syntax).toBeNull();
    const doc = new DOMParser().parseFromString(srcdoc, 'text/html');
    const head = doc.head.children;
    expect(head[0].getAttribute('charset')).toBe('utf-8');
    expect(head[1].getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(head[1].getAttribute('content')).toBe(SANDBOX_CSP);
    expect(head[2].tagName).toBe('SCRIPT');
    expect(head[2].textContent).toContain('"nonce":"n-123"');
    expect(head[2].textContent).toContain('"exerciseId":"web-x"');
    expect(head[2].textContent).toContain(`"loopMs":${LOOP_MS}`);
    expect(doc.querySelector('link')).toBeNull();
    expect(doc.querySelector('style')?.textContent).toBe('p { color: red }');
    const scripts = [...doc.body.querySelectorAll('script')];
    expect(scripts).toHaveLength(2);
    // o script do estudante entra no lugar do <script src="script.js">, protegido e com </script> escapado
    expect(scripts[0].textContent).toContain('for (;;) {__smLoop();}');
    expect(scripts[0].textContent).toContain('"<\\/script><b>"');
    expect(scripts[0].textContent).toContain('window.__smExports={"soma":typeof soma');
    // scripts embutidos no HTML também são protegidos
    expect(scripts[1].textContent).toBe('while(true){__smLoop();}');
  });

  it('a linha informada ao harness é a primeira linha do script do estudante', () => {
    const { srcdoc } = buildPage({ ...base, html, css: '', script: 'linha1();\nlinha2();' });
    const line = Number(/"scriptLine":(\d+)/.exec(srcdoc)![1]);
    expect(srcdoc.split('\n')[line - 1]).toBe('linha1();');
  });

  it('sem referência ao script ou com defer: script no fim do body; sem link: CSS no head', () => {
    const { srcdoc } = buildPage({ ...base, html: '<html><head></head><body><main id="m"></main><script defer src="./script.js"></script></body></html>', css: 'a{}', script: 'x()' });
    const doc = new DOMParser().parseFromString(srcdoc, 'text/html');
    expect(doc.body.lastElementChild?.tagName).toBe('SCRIPT');
    expect(doc.body.lastElementChild?.textContent).toContain('x()');
    expect(doc.querySelector('script[src]')).toBeNull();
    expect(doc.head.querySelector('style')?.textContent).toBe('a{}');
  });

  it('erro de sintaxe: a página roda sem o script e o console mostra o erro', () => {
    const r = buildPage({ ...base, html, css: '', script: 'function (' });
    expect(r.syntax).toMatchObject({ line: 1 });
    expect(r.srcdoc).toContain('Erro de sintaxe no script.js, linha 1');
    expect(r.srcdoc.split('/*__SM_SCRIPT__*/')[1]).not.toContain('function (');
  });

  it('React: runtime antes do código e montagem do componente App', () => {
    const { srcdoc } = buildPage({ ...base, html: '<html><head></head><body><div id="root"></div></body></html>', css: '', script: 'exports.default = function App(){};', react: { runtime: 'window.React={};' } });
    const doc = new DOMParser().parseFromString(srcdoc, 'text/html');
    const scripts = [...doc.body.querySelectorAll('script')].map((s) => s.textContent ?? '');
    expect(scripts[0]).toBe('window.React={};');
    expect(scripts[1]).toContain("require=function(n){if(n==='react')return window.React;");
    expect(scripts[1]).toContain('createRoot(document.getElementById(\'root\')');
  });

  it('o atributo sandbox não dá a mesma origem nem popups, navegação ou modais', () => {
    expect(SANDBOX_ATTR.split(' ').sort()).toEqual(['allow-forms', 'allow-scripts']);
    for (const d of ["connect-src 'none'", "form-action 'none'", "frame-src 'none'", "worker-src 'none'", "default-src 'none'", "base-uri 'none'"]) expect(SANDBOX_CSP).toContain(d);
  });
});

describe('readSandboxMessage', () => {
  const frame = {} as Window;
  const expect_ = { nonce: 'n1', exerciseId: 'web-x', version: 2 };
  const msg = (data: unknown, o: { source?: unknown; origin?: string } = {}) => readSandboxMessage({ source: (o.source ?? frame) as Window, origin: o.origin ?? 'null', data }, frame, expect_);
  const ok = (type: string, payload: unknown = null) => ({ v: 1, nonce: 'n1', exerciseId: 'web-x', version: 2, type, payload });

  it('aceita mensagens bem formadas desta execução', () => {
    expect(msg(ok('ready'))).toEqual({ type: 'ready' });
    expect(msg(ok('console', { level: 'warn', text: 'oi' }))).toEqual({ type: 'console', level: 'warn', text: 'oi' });
    expect(msg(ok('error', { message: 'x is not defined', line: 3 }))).toEqual({ type: 'error', message: 'x is not defined', line: 3 });
    expect(msg(ok('result', { testId: 't1', passed: true, message: null }))).toEqual({ type: 'result', testId: 't1', passed: true, message: null });
  });

  it('recusa outra janela, outra origem, nonce/exercício/versão errados, tipo e formato inválidos', () => {
    expect(msg(ok('ready'), { source: {} })).toBeNull();
    expect(msg(ok('ready'), { origin: 'https://exemplo.com' })).toBeNull();
    expect(msg({ ...ok('ready'), nonce: 'outro' })).toBeNull();
    expect(msg({ ...ok('ready'), exerciseId: 'web-y' })).toBeNull();
    expect(msg({ ...ok('ready'), version: 1 })).toBeNull();
    expect(msg({ ...ok('ready'), v: 2 })).toBeNull();
    expect(msg(ok('eval', { code: 'x' }))).toBeNull();
    expect(msg(ok('result', { testId: 't1', passed: 'sim' }))).toBeNull();
    expect(msg(ok('console', { level: 'debug', text: 'x' }))).toBeNull();
    expect(msg('texto')).toBeNull();
    expect(readSandboxMessage({ source: frame, origin: 'null', data: ok('ready') }, null, expect_)).toBeNull();
  });

  it('corta textos longos', () => {
    const m = msg(ok('console', { level: 'log', text: 'x'.repeat(5000) }));
    expect(m && m.type === 'console' && m.text.length).toBe(2000);
  });
});

describe('catálogo do Web Lab e do React Lab', () => {
  it('8 exercícios web e 4 React válidos, ids únicos, testes com ids únicos', () => {
    const web = WEB_EXERCISES.filter((e) => e.kind === 'web');
    const react = WEB_EXERCISES.filter((e) => e.kind === 'react');
    expect(web).toHaveLength(8);
    expect(react).toHaveLength(4);
    expect(new Set(WEB_EXERCISES.map((e) => e.id)).size).toBe(WEB_EXERCISES.length);
    for (const e of WEB_EXERCISES) {
      expect(exerciseProblems(e, e.kind), e.id).toEqual([]);
      expect(new Set(e.tests.map((t) => t.id)).size, e.id).toBe(e.tests.length);
      expect(e.editable.every((f) => f in e.files), e.id).toBe(true);
      for (const f of Object.keys(e.solution)) expect(e.files, `${e.id}/${f}`).toHaveProperty(f);
      for (const t of e.tests) for (const c of t.checks) if (c.kind === 'call' || c.kind === 'throws') expect(e.exports, `${e.id}: ${c.fn}`).toContain(c.fn);
    }
  });
});
