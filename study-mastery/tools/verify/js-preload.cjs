// Pré-carregado com `node --require js-preload.cjs <caso>` — o caso roda como ponto de entrada REAL
// (CommonJS ou ES module), preservando a semântica de ordem (nextTick, microtasks, timers).
// Captura console.log/console.error e imprime, no encerramento, uma linha JSON {"out": "..."}.
const lines = [];
const fmt = (v) => {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};
const realWrite = process.stdout.write.bind(process.stdout);
console.log = (...a) => void lines.push(a.map(fmt).join(' '));
console.error = console.log;
console.warn = console.log;
console.info = console.log;
process.on('uncaughtException', (e) => {
  lines.push(`${e?.name ?? 'Error'}: ${e?.message ?? e}`);
});
process.on('unhandledRejection', (e) => {
  lines.push(`UnhandledRejection: ${e?.message ?? e}`);
});
process.on('exit', () => realWrite('\n' + JSON.stringify({ out: lines.join('\n') }) + '\n'));
