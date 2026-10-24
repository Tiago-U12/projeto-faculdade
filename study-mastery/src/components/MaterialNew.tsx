import { ArrowLeft, FileText, FileUp, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAccount } from '../account';
import { LIMITS } from '../../supabase/functions/_shared/materialQuality';
import { addPdf, addText, describeExtractError, duplicateOf, readPdf, type Ctx, type Step } from '../materials/service';
import { useCollection, usePersonal } from '../personal/context';

const STEP_TEXT: Record<Step, string> = {
  lendo: 'Recebido: conferindo o arquivo…',
  extraindo: 'Processando: lendo o texto',
  salvando: 'Processando: salvando o texto extraído…',
  enviando: 'Processando: enviando o arquivo para a sua pasta privada…',
  conferindo: 'Processando: conferência no servidor…',
};

export function useMaterialCtx(): Ctx {
  const personal = usePersonal();
  const account = useAccount();
  return { personal, cloud: personal.space.kind === 'account' && account.user ? { client: account.client, uid: account.user.id } : undefined };
}

/** Adicionar material: PDF com texto selecionável ou texto colado. Nada é enviado a IA nesta etapa. */
export function MaterialNew({ disciplineId, go }: { disciplineId: string; go: (to: string) => void }) {
  const ctx = useMaterialCtx();
  const { items: disciplines } = useCollection('disciplines');
  const { items: topics } = useCollection('topics');
  const { items: materials } = useCollection('materials');
  const d = disciplines.find((x) => x.id === disciplineId);
  const [kind, setKind] = useState<'pdf' | 'texto'>('pdf');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<{ step: Step; done?: number; total?: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const account = ctx.personal.space.kind === 'account';
  const busy = !!step;

  const submit = async () => {
    setErr(null);
    try {
      let created;
      if (kind === 'pdf') {
        if (!file) return setErr('Escolha um arquivo PDF.');
        const read = await readPdf(file, (s, done, total) => setStep({ step: s, done, total }));
        const dup = duplicateOf(materials, disciplineId, read.sha256);
        if (dup) {
          setStep(null);
          return setErr(`Este arquivo já foi adicionado nesta disciplina como “${dup.title}”. Abra o material existente em vez de enviar de novo.`);
        }
        created = await addPdf(ctx, { disciplineId, title, file, read, topics }, (s, done, total) => setStep({ step: s, done, total }));
      } else {
        created = await addText(ctx, { disciplineId, title, text, topics }, (s) => setStep({ step: s }));
      }
      go(`#/material?id=${created.id}`);
    } catch (e) {
      setErr(describeExtractError(e));
      setStep(null);
    }
  };

  if (!d) return <p className="muted" role="status">Carregando…</p>;
  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/disciplina?id=${disciplineId}`)}><ArrowLeft size={18} aria-hidden="true" /> {d.name}</button>
      <h1 className="screen-title">Novo <em>material.</em></h1>
      <p className="sub">Aulas, listas, resumos ou o conteúdo da prova. O texto é usado para organizar assuntos, guias e questões desta disciplina.</p>

      <section className="panel privacy" aria-labelledby="h-priv">
        <div className="panel-head"><h2 id="h-priv"><ShieldCheck size={18} aria-hidden="true" /> Para onde vai o material</h2></div>
        {account ? (
          <p>O PDF (até 10 MB) vai para a pasta privada da sua conta; o servidor confere se é mesmo um PDF, o tamanho e se é o mesmo arquivo lido aqui. O texto extraído fica na sua conta. Nada é enviado a provedores de IA sem você pedir uma geração.</p>
        ) : (
          <p>O PDF é lido neste aparelho e só o texto extraído fica salvo aqui: o arquivo não é guardado nem enviado a ninguém.</p>
        )}
      </section>

      <form className="panel form" aria-label="Adicionar material" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="seg" role="group" aria-label="Tipo de material">
          <button type="button" className={'seg-btn' + (kind === 'pdf' ? ' active' : '')} aria-pressed={kind === 'pdf'} onClick={() => setKind('pdf')} disabled={busy}><FileUp size={16} aria-hidden="true" /> PDF</button>
          <button type="button" className={'seg-btn' + (kind === 'texto' ? ' active' : '')} aria-pressed={kind === 'texto'} onClick={() => setKind('texto')} disabled={busy}><FileText size={16} aria-hidden="true" /> Colar texto</button>
        </div>
        <label className="field">
          <span>Nome do material <small>(opcional)</small></span>
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'pdf' ? 'Usa o nome do arquivo se ficar vazio' : 'Ex.: Resumo da aula 5'} disabled={busy} />
        </label>
        {kind === 'pdf' ? (
          <div className="field">
            <span>Arquivo</span>
            <button type="button" className="ghost file-pick" onClick={() => fileRef.current?.click()} disabled={busy}>
              <FileUp size={16} aria-hidden="true" /> {file ? 'Trocar arquivo' : 'Escolher PDF'}
            </button>
            {/* acionado pelo botão acima: fora do Tab e da árvore de acessibilidade */}
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }} />
            <small>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB` : 'PDF com texto selecionável, até 10 MB e 300 páginas. PDF digitalizado (foto/scan) não tem texto para ler.'}</small>
          </div>
        ) : (
          <label className="field">
            <span>Texto</span>
            <textarea value={text} rows={10} maxLength={LIMITS.maxPastedChars} onChange={(e) => setText(e.target.value)} placeholder="Cole aqui o conteúdo (anotações, ementa, texto da aula…)" disabled={busy} />
            <small>{text.length.toLocaleString('pt-BR')} de {LIMITS.maxPastedChars.toLocaleString('pt-BR')} caracteres. O texto é dividido em trechos numerados para citar a origem.</small>
          </label>
        )}
        {step && (
          <p className="progress-note" role="status">
            {STEP_TEXT[step.step]}
            {step.step === 'extraindo' && step.total ? ` (página ${step.done} de ${step.total})` : step.step === 'extraindo' ? '…' : ''}
          </p>
        )}
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="row wrap">
          <button type="button" className="ghost" onClick={() => go(`#/disciplina?id=${disciplineId}`)} disabled={busy}>Cancelar</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Processando…' : 'Adicionar material'}</button>
        </div>
      </form>
    </>
  );
}
