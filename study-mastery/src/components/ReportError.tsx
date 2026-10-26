import { ClipboardCopy, Flag } from 'lucide-react';
import { useId, useState } from 'react';
import { REPORT_REASON_LABEL, type QuestionReport, type ReportReason } from '../types';
import { useStudy } from '../state';
import { usePersonalOptional } from '../personal/context';
import { copyText } from './Help';

export function formatReport(r: QuestionReport): string {
  return [
    'Study Mastery — relato de erro',
    `Questão: ${r.questionId} (versão ${r.questionVersion}, ${r.source === 'banco' ? 'banco existente' : 'questão pessoal'})`,
    `Motivo: ${REPORT_REASON_LABEL[r.reason]}`,
    `Comentário: ${r.comment || '—'}`,
    `Data: ${r.createdAt}`,
    `App: v${__APP_VERSION__}`,
  ].join('\n');
}

/** "Relatar erro" em uma questão: formulário curto; o relato fica no espaço do estudante e pode ser copiado para envio. */
export function ReportError({ questionId, version, source }: { questionId: string; version: number; source: QuestionReport['source'] }) {
  const { report } = useStudy();
  const personal = usePersonalOptional();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('gabarito');
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState<QuestionReport | null>(null);
  const [msg, setMsg] = useState('');
  const id = useId();

  if (source === 'banco') return <a className="text-btn report-btn" href={`#/feedback?question=${encodeURIComponent(questionId)}&version=${version}`}><Flag size={14} aria-hidden="true" /> Relatar erro ou enviar print</a>;

  if (saved) {
    return (
      <div className="report done" role="status">
        <p>{source === 'pessoal' ? 'Relato salvo. A questão fica fora das sessões até você corrigi-la ou arquivá-la (em Questões da disciplina).' : 'Relato salvo. Para que a questão seja corrigida, envie o texto ao responsável pelo Study Mastery.'}</p>
        <button type="button" className="text-btn" onClick={async () => setMsg((await copyText(formatReport(saved))) ? 'Texto copiado.' : 'Copie o texto abaixo manualmente.')}><ClipboardCopy size={14} aria-hidden="true" /> Copiar relato</button>
        {msg && <pre className="diag">{msg === 'Texto copiado.' ? msg : formatReport(saved)}</pre>}
      </div>
    );
  }
  if (!open) return <button type="button" className="text-btn report-btn" onClick={() => setOpen(true)}><Flag size={14} aria-hidden="true" /> Relatar erro</button>;
  return (
    <form
      className="report"
      aria-label="Relatar erro nesta questão"
      onSubmit={(e) => {
        e.preventDefault();
        const rec = report({ questionId, questionVersion: version, source, reason, comment: comment.trim() });
        setSaved(rec);
        // questão pessoal com erro relatado sai das sessões até você revisá-la (editar ou arquivar)
        if (source === 'pessoal' && personal) {
          const note = `${REPORT_REASON_LABEL[reason]}${comment.trim() ? ': ' + comment.trim().slice(0, 300) : ''}`;
          // a lista pode não estar carregada (sessão retomada direto no quiz): busca no espaço atual
          void Promise.resolve(personal.items('questions') ?? personal.repo.list('questions'))
            .then((list) => {
              const pq = list.find((x) => x.id === questionId);
              return pq && personal.save('questions', { ...pq, status: 'reportada', reportNote: note, updatedAt: new Date().toISOString() });
            })
            .catch(() => undefined);
        }
      }}
    >
      <fieldset>
        <legend>O que está errado?</legend>
        {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((k) => (
          <label key={k} className="report-opt"><input type="radio" name={id + '-reason'} checked={reason === k} onChange={() => setReason(k)} /> {REPORT_REASON_LABEL[k]}</label>
        ))}
      </fieldset>
      <label className="field">
        <span>Detalhes (opcional)</span>
        <textarea value={comment} maxLength={1000} rows={3} onChange={(e) => setComment(e.target.value)} placeholder="Ex.: a alternativa C também está correta porque…" />
      </label>
      <div className="row wrap">
        <button type="button" className="ghost" onClick={() => setOpen(false)}>Cancelar</button>
        <button type="submit" className="primary">Salvar relato</button>
      </div>
    </form>
  );
}
