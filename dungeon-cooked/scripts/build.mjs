// Gera um HTML único e autossuficiente a partir dos módulos ES de src/.
// Mini-empacotador sem dependências: cada módulo vira uma função isolada e os
// imports nomeados viram desestruturação. Só usa módulos nativos do Node.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

const IMPORT_RE = /^import\s*(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*))\s*from\s*['"](\.{1,2}\/[^'"]+)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(?:async\s+)?(?:function\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]*)\};?[ \t]*$/gm;

async function collect(entry) {
  const modules = new Map();
  const visiting = new Set();
  async function visit(file, chain) {
    if (modules.has(file)) return;
    if (visiting.has(file)) throw new Error(`Import circular: ${[...chain, file].map(rel).join(' -> ')}`);
    visiting.add(file);
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(IMPORT_RE)].map((m) => ({
      text: m[0],
      named: m[1],
      ns: m[2],
      target: path.resolve(path.dirname(file), m[3]),
    }));
    for (const imp of imports) await visit(imp.target, [...chain, file]);
    visiting.delete(file);
    modules.set(file, { file, source, imports, index: modules.size });
  }
  await visit(entry, []);
  return [...modules.values()];
}

function transform(mod, ids) {
  let code = mod.source;
  for (const imp of mod.imports) {
    const target = ids.get(imp.target);
    let replacement;
    if (imp.ns) replacement = `const ${imp.ns} = ${target};`;
    else {
      const parts = imp.named.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
        const [name, alias] = s.split(/\s+as\s+/);
        return alias ? `${name}: ${alias}` : name;
      });
      replacement = `const { ${parts.join(', ')} } = ${target};`;
    }
    code = code.replace(imp.text, replacement);
  }
  const exported = [];
  code = code.replace(EXPORT_DECL_RE, (match, name) => {
    exported.push(name);
    return match.replace(/^export\s+/, '');
  });
  code = code.replace(EXPORT_LIST_RE, (match, list) => {
    for (const part of list.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [name, alias] = part.split(/\s+as\s+/);
      exported.push(alias ? `${alias}: ${name}` : name);
    }
    return '';
  });
  const leftover = code.match(/^\s*(import|export)\s/m);
  if (leftover) throw new Error(`Sintaxe de módulo não suportada em ${rel(mod.file)}: "${leftover[0].trim()}..."`);
  return `// ${rel(mod.file)}\nconst ${ids.get(mod.file)} = (() => {\n${code}\nreturn { ${exported.join(', ')} };\n})();`;
}

const escapeScript = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const entry = path.join(root, 'src/main.js');
const modules = await collect(entry);
const ids = new Map(modules.map((m) => [m.file, `__m${m.index}`]));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const banner = `/* Dungeon Cooked ${pkg.version} — build ${new Date().toISOString().slice(0, 10)}. Código e arte autorais; ver CREDITS_AND_LICENSES.md. */`;
const js = `${banner}\n'use strict';\n${modules.map((m) => transform(m, ids)).join('\n\n')}`;

// Confere a sintaxe do pacote final antes de gravar.
try {
  new vm.Script(js, { filename: 'Dungeon_Cooked.js' });
} catch (error) {
  console.error('Erro de sintaxe no pacote gerado:', error.message);
  process.exit(1);
}

let html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'src/style.css'), 'utf8');
const linkTag = '<link rel="stylesheet" href="./src/style.css" />';
const scriptTag = '<script type="module" src="./src/main.js"></script>';
if (!html.includes(linkTag) || !html.includes(scriptTag)) throw new Error('index.html sem as tags esperadas de estilo/script');
html = html.replace(linkTag, () => `<style>\n${css}\n</style>`);
html = html.replace(scriptTag, () => `<script>\n(() => {\n${escapeScript(js)}\n})();\n</script>`);
if (/\b(?:src|href)=["']https?:/i.test(html)) throw new Error('O HTML final referencia recurso externo; a build precisa ser offline.');

await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/index.html'), html);
await writeFile(path.join(root, 'dist/Dungeon_Cooked_OFFLINE.html'), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Build concluído: ${modules.length} módulos -> dist/Dungeon_Cooked_OFFLINE.html (${kb} KB). Abre direto do disco, sem internet.`);
