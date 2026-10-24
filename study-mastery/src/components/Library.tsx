import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../types';
import { countByTopic } from '../lib/engine';
import { PURPOSE_INFO, qualitySummary } from '../lib/quality';
import { useStudy } from '../state';

export function Library({ go }: { go: (to: string) => void }) {
  const { bank } = useStudy();
  const qa = useMemo(() => qualitySummary(bank.questions), [bank]);
  const goal = bank.taxonomy.disciplines.reduce((s, d) => s + d.topics.reduce((a, t) => a + t.quota.facil + t.quota.medio + t.quota.dificil, 0), 0);

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Início</button>
      <div className="eyebrow"><BookOpen size={16} aria-hidden="true" /> ACERVO E CONFIABILIDADE</div>
      <h1 className="screen-title">Fontes que <em>ensinam.</em></h1>
      <p className="sub">O banco existente reúne questões de Cálculo II e Full Stack preparadas a partir das aulas. Só aparecem questões que passaram pela verificação descrita abaixo; rascunhos ficam de fora. Nenhuma IA é chamada durante as sessões com este banco.</p>

      <section className="panel" aria-labelledby="h-count">
        <div className="panel-head"><h2 id="h-count">Banco existente</h2><small className="muted">v{bank.manifest.bankVersion}</small></div>
        <p><b>{bank.questions.length}</b> questões disponíveis{bank.questions.length < goal ? ` (meta: ${goal})` : ''}.</p>
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
        <p className="qa-intro">Conferimos respostas com ferramentas de cálculo, testes de código e consulta às fontes, conforme o tipo de questão.</p>
        <dl className="qa-status">
          <div><dt>Verificação automática</dt><dd><b>{qa.automatic}</b> de {qa.total}: o gabarito foi conferido por uma ferramenta.</dd></div>
          {qa.sourceOnly > 0 && <div><dt>Conferência na fonte</dt><dd><b>{qa.sourceOnly}</b> de {qa.total}: sem ferramenta de execução; conferidas no material citado, com assistência de IA.</dd></div>}
          <div><dt>Revisão assistida por IA</dt><dd><b>{qa.aiReviewed}</b> de {qa.total}: texto, alternativas e explicações revisados com IA.</dd></div>
          <div><dt>Revisão humana</dt><dd>{qa.humanReviewed === 0 ? <><b>Pendente.</b> Nenhuma questão foi revisada por professor ou monitor até agora.</> : <><b>{qa.humanReviewed}</b> de {qa.total}.</>}</dd></div>
        </dl>
        <details className="src-details">
          <summary>Ver detalhes técnicos</summary>
          <ul className="qa-groups">
            {qa.groups.map((g) => (
              <li key={g.purpose}>
                <b>{PURPOSE_INFO[g.purpose].name}: {g.count}</b>
                <p>{PURPOSE_INFO[g.purpose].what}</p>
                <small>{g.methods.map((m) => `${m.method} (${m.count})`).join('; ')}</small>
              </li>
            ))}
            <li><b>Em todas</b><p>Quatro alternativas distintas, explicação da correta e de cada errada, fonte com o ponto exato (slide, página ou exercício) e detecção automática de duplicatas.</p></li>
          </ul>
        </details>
        <h3 className="qa-sub">Limites</h3>
        <ul className="plain">
          <li>A verificação confere o gabarito; não garante que o enunciado seja o mais claro possível.</li>
          <li>Revisão assistida por IA não substitui revisão humana. Se encontrar um erro, use “Relatar erro” na questão.</li>
          <li>Questões pessoais, criadas a partir dos seus materiais, não passam por estas verificações: cada uma mostra o próprio status.</li>
        </ul>
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
