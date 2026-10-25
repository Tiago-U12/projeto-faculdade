// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { makeBank } from '../../lib/bank';
import { memoryBackend } from '../../personal/backend';
import { PersonalProvider } from '../../personal/context';
import { LocalRepo } from '../../personal/repo';
import { StudyProvider } from '../../state';
import { QuestionsPage } from '../Questions';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('renderiza blocos de código no enunciado e na explicação pessoais sem criar pre dentro de p', async () => {
  const repo = new LocalRepo(memoryBackend());
  const dates = { createdAt: '2026-10-24T12:00:00Z', updatedAt: '2026-10-24T12:00:00Z' };
  await repo.put('disciplines', { ...dates, id: 'd-code', name: 'Programação', description: '', color: 'menta' });
  await repo.put('topics', { ...dates, id: 't-code', disciplineId: 'd-code', name: 'JavaScript', position: 0, origin: 'manual' });
  await repo.put('questions', {
    ...dates, id: 'q-code', disciplineId: 'd-code', topicId: 't-code', status: 'criada_aluno', difficulty: 'facil', version: 1, materialIds: [],
    stem: 'Qual é a saída deste exemplo?\n```js\nconsole.log(1 + 1);\n```',
    options: [{ id: 'a', text: '2' }, { id: 'b', text: '1' }, { id: 'c', text: '0' }, { id: 'd', text: '3' }], correctOptionId: 'a',
    explanation: { correct: 'A soma é mostrada pelo código:\n```js\nconst soma = 1 + 1;\n```', wrong: {}, steps: [] }, refs: [], origin: { kind: 'aluno' },
  });
  const bank = makeBank([], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 0 }, byDiscipline: {} });
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const { container } = render(<StudyProvider bank={bank} store={localStorage}><PersonalProvider repo={repo}><QuestionsPage disciplineId="d-code" go={() => {}} /></PersonalProvider></StudyProvider>);
  await waitFor(() => expect(container.querySelectorAll('.q-body pre')).toHaveLength(2));
  expect(container.querySelector('.q-body p pre')).toBeNull();
  expect(container.querySelectorAll('.q-body pre')[0]).toHaveTextContent('console.log(1 + 1);');
  expect(errors.mock.calls.flat().join(' ')).not.toMatch(/cannot be a descendant|cannot contain a nested|validateDOMNesting/);
});
