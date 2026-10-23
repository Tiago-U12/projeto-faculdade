import katex from 'katex';
import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';

const TOKEN = /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
const cache = new Map<string, string>();

function tex(src: string, display: boolean): string {
  const key = (display ? 'D' : 'I') + src;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml', trust: false });
    cache.set(key, html);
  }
  return html;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(TOKEN);
  parts.forEach((p, i) => {
    if (!p) return;
    const k = `${keyPrefix}-${i}`;
    if (p.startsWith('```')) {
      const body = p.slice(3, -3).replace(/^[a-zA-Z0-9+#-]*\n/, '').replace(/\n$/, '');
      out.push(
        <pre key={k} className="code-block" tabIndex={0}>
          <code>{body}</code>
        </pre>,
      );
    } else if (p.startsWith('`')) out.push(<code key={k}>{p.slice(1, -1)}</code>);
    else if (p.startsWith('$$')) out.push(<span key={k} className="math-display" dangerouslySetInnerHTML={{ __html: tex(p.slice(2, -2), true) }} />);
    else if (p.startsWith('$')) out.push(<span key={k} className="math-inline" dangerouslySetInnerHTML={{ __html: tex(p.slice(1, -1), false) }} />);
    else if (p.startsWith('**')) out.push(<strong key={k}>{p.slice(2, -2)}</strong>);
    else if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) out.push(<em key={k}>{p.slice(1, -1)}</em>);
    else {
      p.split('\n').forEach((line, j, arr) => {
        out.push(line);
        if (j < arr.length - 1) out.push(<br key={`${k}-br${j}`} />);
      });
    }
  });
  return out;
}

/** Texto com fórmulas LaTeX ($...$, $$...$$), código (`x` e ```blocos```) e **negrito**. Nada de HTML cru: só KaTeX vira HTML. */
export const RichText = memo(function RichText({ text, as: Tag = 'span', className }: { text: string; as?: 'span' | 'div' | 'p'; className?: string }) {
  const nodes = useMemo(() => renderInline(text, 'r'), [text]);
  return <Tag className={className}>{nodes}</Tag>;
});
