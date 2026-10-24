import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../types';
import { countByTopic } from '../lib/engine';
import { useStudy } from '../state';

export function Library({ go }: { go: (to: string) => void }) {
  const { bank } = useStudy();
  const method = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of bank.questions) m[q.verifiedBy] = (m[q.verifiedBy] ?? 0) + 1;
    return m;
  }, [bank]);
  const human = bank.questions.filter((q) => q.reviewedBy === 'human').length;
  const goal = bank.taxonomy.disciplines.reduce((s, d) => s + d.topics.reduce((a, t) => a + t.quota.facil + t.quota.medio + t.quota.dificil, 0), 0);

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Início</button>
      <div className="eyebrow"><BookOpen size={16} aria-hidden="true" /> ACERVO E CONFIABILIDADE</div>
      <h1 className="screen-title">Fontes que <em>ensinam.</em></h1>
      <p className="sub">As questões disponíveis têm explicação e referência aos materiais usados. Confira abaixo como as respostas são verificadas e o status da revisão. Nenhuma IA é chamada durante suas sessões.</p>

      <section className="panel" aria-labelledby="h-count">
        <div className="panel-head"><h2 id="h-count">Banco completo · revisão humana pendente</h2><small className="muted">v{bank.manifest.bankVersion}</small></div>
        <p><b>{bank.questions.length}</b> de {goal} questões aprovadas.</p>
        {bank.taxonomy.disciplines.map((d) => {
          const per = countByTopic(bank.questions, d.id);
          return (
            <div key={d.id} className="lib-disc">
              <h3>{d.name}</h3>
              {DIFFICULTIES.map((k) => {
                const have = [...per.values()].reduce((s, c) => s + c[k], 0);
                const meta = d.topics.reduce((s, t) => s + t.quota[k], 0);
                return (
                  <div className="bar-row" key={k}>
                    <span className="bar-label">{DIFFICULTY_LABEL[k]}</span>
                    <span className="meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (100 * have) / meta)}%` }} /></span>
                    <span className="bar-val">{have}/{meta}</span>
                  </div>
                );
              })}
              <details className="src-details">
                <summary>Cobertura por assunto</summary>
                <ul className="cov">
                  {d.topics.map((t) => {
                    const c = per.get(t.id) ?? { facil: 0, medio: 0, dificil: 0 };
                    const total = c.facil + c.medio + c.dificil;
                    const meta = t.quota.facil + t.quota.medio + t.quota.dificil;
                    return <li key={t.id}><span>{t.name}</span><b>{total}/{meta}</b>{total < 20 && <small>{total === 0 ? 'sem questões ainda' : 'abaixo de 20: sessão de 20 incompleta'}</small>}</li>;
                  })}
                </ul>
              </details>
            </div>
          );
        })}
      </section>

      <section className="panel" aria-labelledby="h-qa">
        <div className="panel-head"><h2 id="h-qa"><ShieldCheck size={18} aria-hidden="true" /> Como verificamos as questões</h2></div>
        <ul className="plain">
          <li><b>Conferência das respostas:</b> usamos ferramentas de cálculo, testes de código e consulta às fontes, conforme o tipo de questão.</li>
          <li><b>Revisão:</b> {bank.questions.length - human} questões com revisão assistida por IA e {human} com revisão humana.{human < bank.questions.length && <> A revisão humana {human === 0 ? 'ainda está pendente' : 'ainda não foi concluída para todo o banco'}.</>}</li>
          <li><b>Duplicatas e ambiguidades:</b> detecção automática; nada de “todas as anteriores”.</li>
          <li><b>Rastreabilidade:</b> cada questão cita a fonte e o ponto exato (slide, página, exercício).</li>
        </ul>
        <p className="quality-note">Essas verificações ajudam a identificar problemas, mas não eliminam todos os erros.</p>
        <details className="src-details quality-details">
          <summary>Ver detalhes técnicos</summary>
          {[
            { title: 'Matemática', description: 'SymPy e mpmath são ferramentas usadas para conferir expressões e resultados numéricos.', matches: (name: string) => name.startsWith('sympy') },
            { title: 'Programação', description: 'Os testes executam exemplos de código, páginas no navegador ou consultas ao banco de dados.', matches: (name: string) => /^(js-exec|node-exec|web-chromium|sql)/.test(name) },
            { title: 'Consulta às fontes', description: 'As afirmações são conferidas nos materiais de referência.', matches: (name: string) => name.startsWith('source') },
            { title: 'Outros métodos', description: 'Outros métodos registrados nas questões publicadas.', matches: (name: string) => !/^(sympy|js-exec|node-exec|web-chromium|sql|source)/.test(name) },
          ].map((group) => {
            const entries = Object.entries(method).filter(([name]) => group.matches(name));
            if (!entries.length) return null;
            return <div className="quality-group" key={group.title}>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <ul className="plain">
                {entries.map(([name, count]) => <li key={name}><code>{name}</code>: {count} {count === 1 ? 'questão' : 'questões'}</li>)}
              </ul>
            </div>;
          })}
          {!Object.keys(method).length && <p>Nenhum método registrado.</p>}
        </details>
      </section>

      <section className="panel" aria-labelledby="h-src">
        <div className="panel-head"><h2 id="h-src">Fontes efetivamente usadas</h2></div>
        <ul className="plain">
          {[...bank.sources.values()].map((s) => (
            <li key={s.id}><b>{s.title}</b>{s.author && <> — {s.author}</>}{s.institution && <small> · {s.institution}</small>}{s.license && <small> · {s.license}</small>}</li>
          ))}
        </ul>
      </section>
      <button type="button" className="primary" onClick={() => go('#/setup')}>Ir para os estudos <ArrowRight size={17} aria-hidden="true" /></button>
    </>
  );
}
