import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export const OPTIONAL_ASSET = /\.(ttf|woff)$|pdf\.worker/;

export function injectPrecache(outDir: string, template: string, version: string): string[] {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
  // Fontes .ttf/.woff do KaTeX são alternativas que o Chrome/Safari atuais não usam (pegam a .woff2): ficam fora do
  // pré-cache para não baixar ~700 KB à toa no celular; se algum navegador pedir, o worker guarda na primeira vez.
  const files = walk(outDir).filter((f) => path.relative(outDir, f) !== 'sw.js' && !OPTIONAL_ASSET.test(f)).sort();
  const hash = createHash('sha256').update(version).update(template);
  for (const file of files) hash.update(path.relative(outDir, file)).update(fs.readFileSync(file));
  const assets = ['./', ...files.map((file) => './' + path.relative(outDir, file).split(path.sep).join('/'))];
  const sw = template.replace("'__SM_VERSION__'", JSON.stringify(`${version}-${hash.digest('hex').slice(0, 16)}`))
    .replace('/*__SM_ASSETS__*/ []', JSON.stringify(assets));
  fs.writeFileSync(path.join(outDir, 'sw.js'), sw);
  return assets;
}

export function offlinePrecache(version: string): Plugin {
  let outDir: string;
  let publicDir: string;
  return {
    name: 'study-mastery-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    closeBundle() {
      injectPrecache(outDir, fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8'), version);
    },
  };
}
