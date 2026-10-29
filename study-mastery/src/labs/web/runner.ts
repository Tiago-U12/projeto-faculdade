// "Verificar resposta" do Web Lab: cada teste roda numa página isolada NOVA (iframe fora da tela, na largura do
// teste), para que um teste não herde o estado do anterior. A página do app só pede o teste e lê a resposta validada.
import type { LabGrade, LabTestResult } from '../types';
import { readSandboxMessage, SANDBOX_ATTR, type BuiltPage } from './sandbox';
import type { WebTest } from './types';

export const TEST_TIMEOUTS = { load: 6000, test: 5000 };

export interface TestTarget {
  exerciseId: string;
  version: number;
  /** monta a página do estudante com um nonce novo */
  build(nonce: string): BuiltPage;
}

function runOne(target: TestTarget, test: WebTest, host: HTMLElement): Promise<LabTestResult> {
  const nonce = crypto.randomUUID();
  const page = target.build(nonce);
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', SANDBOX_ATTR);
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.title = 'Teste automático';
  const width = test.width ?? 390;
  Object.assign(frame.style, { position: 'fixed', left: '-12000px', top: '0', width: `${width}px`, height: '800px', border: '0', visibility: 'hidden', pointerEvents: 'none' });
  const expect = { nonce, exerciseId: target.exerciseId, version: target.version };
  return new Promise<LabTestResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    let started = false;
    const errors: string[] = [];
    const finish = (passed: boolean, message?: string) => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      frame.remove();
      resolve({ id: test.id, label: test.label, passed, message });
    };
    const onMessage = (e: MessageEvent) => {
      const m = readSandboxMessage(e, frame.contentWindow, expect);
      if (!m) return;
      if (m.type === 'error') errors.push(m.line ? `${m.message} (linha ${m.line})` : m.message);
      if (m.type === 'ready') {
        // um segundo "ready" = a página recarregou no meio do teste (ex.: navegação feita pelo script)
        if (started) return finish(false, 'A página recarregou durante o teste (o script navegou ou enviou o formulário sem preventDefault).');
        started = true;
        clearTimeout(timer);
        timer = setTimeout(() => finish(false, 'O teste não terminou a tempo (laço infinito ou espera sem fim?).'), TEST_TIMEOUTS.test);
        frame.contentWindow?.postMessage({ nonce, type: 'run-test', test }, '*');
      }
      if (m.type === 'result' && m.testId === test.id) finish(m.passed, m.passed ? undefined : (m.message ?? 'Não passou.') + (errors.length && !m.message?.includes(errors[0]) ? ` Erro no script: ${errors[0]}` : ''));
    };
    addEventListener('message', onMessage);
    timer = setTimeout(() => finish(false, page.syntax ? `Erro de sintaxe (linha ${page.syntax.line}): ${page.syntax.error}` : 'A página não terminou de carregar (laço infinito no carregamento?).'), TEST_TIMEOUTS.load);
    frame.srcdoc = page.srcdoc;
    host.append(frame);
  });
}

/** Roda os testes em sequência (um iframe por vez, para não pesar no celular). */
export async function runWebTests(target: TestTarget, tests: WebTest[], host: HTMLElement = document.body): Promise<LabGrade> {
  const results: LabTestResult[] = [];
  for (const t of tests) results.push(await runOne(target, t, host));
  const n = results.filter((r) => r.passed).length;
  const passed = n === results.length;
  return {
    passed,
    score: Math.round((100 * n) / results.length),
    results,
    summary: passed ? `Todos os ${results.length} testes passaram.` : `Passou em ${n} de ${results.length} testes.`,
  };
}
