// React Lab: transforma o JSX do estudante em JavaScript comum NO APARELHO (sucrase, só análise de texto — nada é
// executado aqui) e carrega o runtime do React que vai embutido no sandbox. Os dois são baixados só quando um
// exercício de React é aberto, e ficam no pré-cache para uso offline.
import type { GuardSyntaxError } from './guard';

export interface ReactTools {
  /** JSX + import/export → CommonJS (mantém os números de linha) */
  compile(source: string): { code: string } | GuardSyntaxError;
  runtime: string;
}

let tools: Promise<ReactTools> | null = null;

export function loadReactTools(): Promise<ReactTools> {
  return (tools ??= Promise.all([import('sucrase'), import('virtual:sm-react-runtime')])
    .then(([sucrase, rt]) => ({
      runtime: rt.default,
      compile(source: string) {
        try {
          return { code: sucrase.transform(source, { transforms: ['jsx', 'imports'], production: true, jsxRuntime: 'classic', filePath: 'App.jsx' }).code };
        } catch (e) {
          const err = e as Error & { loc?: { line: number; column: number } };
          const m = /\((\d+):(\d+)\)/.exec(err.message);
          return { error: err.message.replace(/^Error transforming [^:]+:\s*/, '').replace(/\s*\(\d+:\d+\)\s*$/, ''), line: err.loc?.line ?? (m ? Number(m[1]) : 0), column: (err.loc?.column ?? (m ? Number(m[2]) : 0)) + (err.loc ? 1 : 0) };
        }
      },
    }))
    .catch((e) => {
      tools = null;
      throw e;
    }));
}
