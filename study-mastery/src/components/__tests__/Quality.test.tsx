// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { makeBank } from '../../lib/bank';
import { makeQ } from '../../lib/__tests__/fixtures';
import { qualitySummary, technicalGroups } from '../../lib/quality';
import { StudyProvider } from '../../state';
import type { PublishedQuestion } from '../../types';
import { Library } from '../Library';
import { Home } from '../Home';

function mount(questions: PublishedQuestion[], home = false) {
  const bank = makeBank(questions, { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: questions.length }, byDiscipline: {} });
  return render(<StudyProvider bank={bank} store={localStorage}>{home ? <Home go={() => {}} /> : <Library go={() => {}} />}</StudyProvider>);
}
const q = (reviewedBy: PublishedQuestion['reviewedBy'], verifiedBy = 'sympy+mpmath.diff') => makeQ({ topicId: 'lhopital', reviewedBy, verifiedBy });
afterEach(() => { cleanup(); localStorage.clear(); });

describe('qualidade para estudantes', () => {
  it('separa a frase e a limitação visíveis dos métodos inicialmente recolhidos', () => {
    const { container } = mount([q('ai-assisted'), q('ai-assisted', 'node-exec (--permission, sandbox)'), q('ai-assisted', 'source-review')]);
    expect(screen.getByText('Conferimos respostas com ferramentas de cálculo, testes de código e consulta às fontes, conforme o tipo de questão.')).toBeVisible();
    const warning = container.querySelector('.qa-notice');
    expect(warning).toBeVisible();
    expect(warning).toHaveTextContent('A revisão humana ainda está pendente. As verificações automáticas não eliminam todos os erros.');
    const details = container.querySelector('.qa-details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(details).getByText('Ver detalhes técnicos')).toBeVisible();
    expect(within(details).getByText('sympy+mpmath.diff: 1')).not.toBeVisible();
    expect(warning?.closest('details')).toBeNull();
    expect(within(details).getAllByRole('heading', { hidden: true }).map((h) => h.textContent)).toEqual(['Matemática: 1', 'Programação: 1', 'Consulta às fontes: 1']);
  });
  it('status acompanha a revisão parcial e deixa de anunciar pendência quando todas são humanas', () => {
    const partial = mount([q('ai-assisted'), q('human')]);
    expect(partial.container.querySelector('.qa-notice')).toHaveTextContent('pendente em 1 questão');
    partial.unmount();
    const human = mount([q('human')]);
    expect(human.container.querySelector('.qa-notice')).not.toHaveTextContent('pendente');
    expect(human.container.querySelector('.qa-status')).toHaveTextContent('1 de 1 questões com revisão humana registrada.');
  });
  it('Home usa o mesmo estado real, sem atribuir revisão IA a todas as questões', () => {
    const { container } = mount([q('ai-assisted'), q('human')], true);
    expect(container.querySelector('.bank-note')).toHaveTextContent('1 com assistência de IA e 1 com revisão humana');
    expect(container.querySelector('.bank-note')).toHaveTextContent('Revisão humana pendente em 1 questão.');
  });
  it('agrupa por finalidade sem perder novos métodos ou confundir registros desconhecidos com IA', () => {
    const questions = [q('ai-assisted'), q('human', 'js-exec (node --permission)'), q('human', 'web-chromium (sem rede)'), q('ai-assisted', 'sql (MariaDB)'), q('ai-assisted', 'source-review')];
    const groups = technicalGroups(qualitySummary(questions));
    expect(groups.map((g) => [g.name, g.count])).toEqual([['Matemática', 1], ['Programação', 3], ['Consulta às fontes', 1]]);
    expect(technicalGroups(qualitySummary([]))).toEqual([]);
    const unknown = { ...q('ai-assisted', 'método novo'), reviewedBy: 'desconhecido' } as unknown as PublishedQuestion;
    expect(technicalGroups(qualitySummary([unknown]))[0]).toMatchObject({ name: 'Outros registros', count: 1 });
    expect(qualitySummary([unknown]).aiReviewed).toBe(0);
  });
});
