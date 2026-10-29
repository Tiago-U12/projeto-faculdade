import { build } from 'esbuild';
import type { Plugin } from 'vite';

/**
 * Módulo virtual com o React do próprio app empacotado como script clássico (window.React / window.ReactDOM), em
 * texto. O React Lab embute esse texto no documento isolado de cada execução: o sandbox não baixa nada da rede e
 * funciona offline (o texto vem num chunk pré-cacheado do app). Licença MIT do React preservada nos comentários.
 */
export const REACT_RUNTIME_ID = 'virtual:sm-react-runtime';

export function reactSandboxRuntime(): Plugin {
  const resolved = '\0' + REACT_RUNTIME_ID;
  let root = process.cwd();
  return {
    name: 'study-mastery-react-runtime',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === REACT_RUNTIME_ID ? resolved : undefined;
    },
    async load(id) {
      if (id !== resolved) return undefined;
      const out = await build({
        stdin: {
          contents: "import * as React from 'react'; import * as ReactDOM from 'react-dom/client'; window.React = React; window.ReactDOM = ReactDOM;",
          resolveDir: root,
          loader: 'js',
        },
        bundle: true,
        minify: true,
        format: 'iife',
        target: 'es2020',
        platform: 'browser',
        write: false,
        legalComments: 'inline',
        define: { 'process.env.NODE_ENV': '"production"' },
      });
      return `export default ${JSON.stringify(out.outputFiles[0].text)};`;
    },
  };
}
