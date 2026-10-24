import { CloudUpload, KeyRound, LogIn, LogOut, RefreshCw, Smartphone, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MIN_PASSWORD, useAccount } from '../account';
import { useSync } from '../cloud/ProgressSync';
import { accountStateKey, browserStore, emptyState, exportState, loadState, STATE_KEY, type AppState } from '../lib/storage';
import { idbBackend } from '../personal/backend';
import { useCollection, usePersonal } from '../personal/context';
import { IMPORT_LOG_KEY, isEmptyPlan, planImport, type ImportPlan } from '../personal/importPlan';
import { LocalRepo } from '../personal/repo';
import type { PDiscipline, PTopic } from '../personal/types';
import { attemptToRow, reportToRow } from '../lib/sync';
import { DEVICE_DB } from '../space';
import { downloadText } from './Help';

interface DeviceData {
  state: AppState;
  disciplines: PDiscipline[];
  topics: PTopic[];
}

async function readDeviceData(): Promise<DeviceData> {
  const state = loadState(browserStore(), STATE_KEY);
  try {
    const repo = new LocalRepo(idbBackend(DEVICE_DB));
    return { state, disciplines: await repo.list('disciplines'), topics: await repo.list('topics') };
  } catch {
    return { state, disciplines: [], topics: [] };
  }
}

const countText = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Account({ go }: { go: (to: string) => void }) {
  const a = useAccount();
  return (
    <>
      <h1 className="screen-title">Sua <em>conta.</em></h1>
      {a.notice && <p className="notice" role="alert">{a.notice} <button type="button" className="text-btn" onClick={a.clearNotice}>Ok</button></p>}
      {!a.configured ? <NotConfigured /> : a.status === 'signedIn' ? <SignedIn go={go} /> : <SignedOut />}
    </>
  );
}

function NotConfigured() {
  return (
    <>
      <p className="sub">As contas ainda não estão ativadas neste site. Você pode usar tudo sem conta: progresso, disciplinas, materiais, guias, questões e agenda ficam salvos neste aparelho. A geração por IA precisa de conta.</p>
      <section className="panel">
        <div className="panel-head"><h2><Smartphone size={18} aria-hidden="true" /> Levar para outro aparelho</h2></div>
        <p>Por enquanto, use <b>Exportar histórico</b> em Progresso e importe o arquivo no outro aparelho. Quando as contas forem ativadas, você poderá entrar e escolher importar o que está aqui.</p>
      </section>
    </>
  );
}

function SignedOut() {
  const a = useAccount();
  const [mode, setMode] = useState<'entrar' | 'criar' | 'senha'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'entrar') await a.signIn(email, password);
      else if (mode === 'criar') setMsg({ ok: true, text: await a.signUp(email, password) });
      else setMsg({ ok: true, text: await a.sendReset(email) });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="sub">Com uma conta, seu progresso, suas disciplinas e seus materiais ficam disponíveis em qualquer aparelho. Sem conta, tudo continua funcionando neste aparelho.</p>
      <div className="seg" role="group" aria-label="O que você quer fazer">
        {([['entrar', 'Entrar'], ['criar', 'Criar conta'], ['senha', 'Esqueci a senha']] as const).map(([k, label]) => (
          <button key={k} type="button" className={'seg-btn' + (mode === k ? ' active' : '')} aria-pressed={mode === k} onClick={() => { setMode(k); setMsg(null); }}>{label}</button>
        ))}
      </div>
      <form className="panel form" aria-label={mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Recuperar senha'} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'senha' && (
          <label className="field">
            <span>Senha</span>
            <input type="password" autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} required minLength={mode === 'criar' ? MIN_PASSWORD : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === 'criar' && <small>Pelo menos {MIN_PASSWORD} caracteres.</small>}
          </label>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {mode === 'entrar' ? <><LogIn size={17} aria-hidden="true" /> Entrar</> : mode === 'criar' ? <><UserPlus size={17} aria-hidden="true" /> Criar conta</> : <><KeyRound size={17} aria-hidden="true" /> Enviar link para nova senha</>}
        </button>
        {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      </form>
      <p className="hint">Ao entrar, nada deste aparelho é enviado automaticamente: você escolhe se quer importar.</p>
    </>
  );
}

function SignedIn({ go }: { go: (to: string) => void }) {
  const a = useAccount();
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [newPass, setNewPass] = useState('');

  const doSignOut = async (keepCopy: boolean) => {
    setBusy(true);
    try {
      const uid = a.user!.id;
      await a.signOut();
      // aparelho compartilhado: sem pendências, nada da conta fica guardado aqui
      if (!keepCopy) browserStore()?.removeItem(accountStateKey(uid));
      go('#/');
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <>
      <p className="sub">Conectado como <b>{a.user!.email}</b>. Seu progresso, suas disciplinas e seus materiais ficam na sua conta, separados das outras contas.</p>
      {a.recovery && (
        <form className="panel form" aria-label="Criar nova senha" onSubmit={(e) => { e.preventDefault(); setBusy(true); a.updatePassword(newPass).then((t) => { setMsg({ ok: true, text: t }); setNewPass(''); }, (er) => setMsg({ ok: false, text: (er as Error).message })).finally(() => setBusy(false)); }}>
          <div className="panel-head"><h2><KeyRound size={18} aria-hidden="true" /> Crie uma nova senha</h2></div>
          <label className="field">
            <span>Nova senha</span>
            <input type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            <small>Pelo menos {MIN_PASSWORD} caracteres.</small>
          </label>
          <button type="submit" className="primary" disabled={busy}>Salvar nova senha</button>
        </form>
      )}

      <section className="panel" aria-labelledby="h-sync">
        <div className="panel-head"><h2 id="h-sync"><RefreshCw size={18} aria-hidden="true" /> Sincronização</h2></div>
        {sync && (
          <>
            <p>{sync.syncing ? 'Sincronizando…' : sync.error ? sync.error : sync.lastSync ? `Atualizado em ${new Date(sync.lastSync).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.` : 'Ainda não sincronizado.'}</p>
            {sync.pending > 0 && <p className="hint">{countText(sync.pending, 'sessão concluída ainda não enviada', 'sessões concluídas ainda não enviadas')}.</p>}
            <button type="button" className="ghost" disabled={sync.syncing} onClick={() => void sync.syncNow()}><RefreshCw size={16} aria-hidden="true" /> Sincronizar agora</button>
          </>
        )}
      </section>

      <ImportFromDevice />

      <section className="panel" aria-labelledby="h-out">
        <div className="panel-head"><h2 id="h-out"><LogOut size={18} aria-hidden="true" /> Sair deste aparelho</h2></div>
        {leaving ? (
          <div className="confirm" role="alertdialog" aria-label="Sair">
            {sync && sync.pending > 0 ? (
              <>
                <p>{countText(sync.pending, 'sessão ainda não foi enviada', 'sessões ainda não foram enviadas')} à conta. Sincronize antes, ou saia mantendo uma cópia neste aparelho (ela é enviada quando você entrar aqui de novo).</p>
                <div className="row wrap">
                  <button type="button" className="ghost" onClick={() => setLeaving(false)}>Cancelar</button>
                  <button type="button" className="ghost" disabled={busy} onClick={() => void doSignOut(true)}>Sair e manter a cópia</button>
                </div>
              </>
            ) : (
              <>
                <p>Ao sair, a cópia do seu progresso guardada neste aparelho é apagada; tudo continua na sua conta.</p>
                <div className="row wrap">
                  <button type="button" className="ghost" onClick={() => setLeaving(false)}>Cancelar</button>
                  <button type="button" className="primary" disabled={busy} onClick={() => void doSignOut(false)}>Sair</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setLeaving(true)}><LogOut size={16} aria-hidden="true" /> Sair</button>
        )}
      </section>
      <DeleteAccount go={go} />
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </>
  );
}

/** Exclusão da conta: arquivos no Storage e todos os dados no banco (em cascata), pela função do servidor. */
function DeleteAccount({ go }: { go: (to: string) => void }) {
  const a = useAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const sb = await a.client();
      const uid = a.user!.id;
      const { error } = await sb.functions.invoke('delete-account', { body: { confirmar: 'EXCLUIR' } });
      if (error) {
        const body = await (error as { context?: Response }).context?.json().catch(() => null);
        throw new Error(body?.error ?? 'O servidor não concluiu a exclusão. Tente de novo.');
      }
      browserStore()?.removeItem(accountStateKey(uid));
      await a.signOut().catch(() => undefined);
      go('#/');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <section className="panel" aria-labelledby="h-del-acc">
      <div className="panel-head"><h2 id="h-del-acc"><Trash2 size={18} aria-hidden="true" /> Excluir conta</h2></div>
      {!open ? (
        <button type="button" className="text-btn danger-text" onClick={() => setOpen(true)}>Excluir conta e todos os dados</button>
      ) : (
        <div className="confirm" role="alertdialog" aria-label="Excluir conta">
          <p>Serão apagados da conta: disciplinas, assuntos, materiais (arquivos PDF e textos extraídos), guias, questões pessoais, eventos da agenda, progresso, sessões, relatos de erro e o registro de gerações por IA e do consumo. Os dados guardados neste aparelho sem conta não são afetados. Não dá para desfazer.</p>
          <label className="field">
            <span>Para confirmar, digite EXCLUIR</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <div className="row wrap">
            <button type="button" className="ghost" onClick={() => { setOpen(false); setTyped(''); }}>Cancelar</button>
            <button type="button" className="danger" disabled={busy || typed.trim().toUpperCase() !== 'EXCLUIR'} onClick={() => void run()}>{busy ? 'Excluindo…' : 'Excluir conta'}</button>
          </div>
          {err && <p className="form-error" role="alert">{err}</p>}
        </div>
      )}
    </section>
  );
}

/** Mostra o que existe neste aparelho fora da conta e importa só quando o estudante confirmar. */
function ImportFromDevice() {
  const a = useAccount();
  const p = usePersonal();
  const sync = useSync();
  const { items: accDisciplines, loading: l1 } = useCollection('disciplines');
  const { items: accTopics, loading: l2 } = useCollection('topics');
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [log, setLog] = useState<string | null>(null);

  useEffect(() => {
    void readDeviceData().then(setDevice);
    try {
      const all = JSON.parse(localStorage.getItem(IMPORT_LOG_KEY) ?? '{}') as Record<string, string>;
      setLog(all[a.user!.id] ?? null);
    } catch {
      /* sem registro */
    }
  }, [a.user]);

  if (!device) return null;
  const total = device.state.attempts.length + device.disciplines.length + (device.state.reports?.length ?? 0);
  if (!total) return null;

  const prepare = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const sb = await a.client();
      const ids = async (table: string) => {
        const out = new Set<string>();
        for (let from = 0; ; from += 1000) {
          const { data, error } = await sb.from(table).select('id').range(from, from + 999);
          if (error) throw new Error('Não foi possível consultar a conta: ' + error.message);
          for (const r of data ?? []) out.add(r.id as string);
          if (!data || data.length < 1000) break;
        }
        return out;
      };
      setPlan(planImport(device, { attemptIds: await ids('attempts'), reportIds: await ids('question_reports'), disciplines: accDisciplines, topics: accTopics }));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!plan) return;
    setBusy(true);
    setMsg(null);
    try {
      const sb = await a.client();
      const uid = a.user!.id;
      if (plan.disciplines.length) await p.repo.putMany('disciplines', plan.disciplines, { onlyNew: true });
      if (plan.topics.length) await p.repo.putMany('topics', plan.topics, { onlyNew: true });
      if (plan.attempts.length) {
        const { error } = await sb.from('attempts').upsert(plan.attempts.map((x) => attemptToRow(x, uid)), { onConflict: 'owner_id,id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      if (plan.reports.length) {
        const { error } = await sb.from('question_reports').upsert(plan.reports.map((x) => reportToRow(x, uid)), { onConflict: 'owner_id,id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      await Promise.all([p.load('disciplines'), p.load('topics')]);
      await sync?.syncNow();
      const when = new Date().toISOString();
      try {
        const all = JSON.parse(localStorage.getItem(IMPORT_LOG_KEY) ?? '{}') as Record<string, string>;
        localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify({ ...all, [uid]: when }));
      } catch {
        /* só informativo */
      }
      setLog(when);
      setPlan(null);
      setMsg({ ok: true, text: 'Importado. Os dados originais continuam neste aparelho, no espaço sem conta.' });
    } catch (e) {
      setMsg({ ok: false, text: 'A importação parou: ' + (e as Error).message + ' O que já foi enviado não será duplicado ao tentar de novo.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="h-import">
      <div className="panel-head"><h2 id="h-import"><CloudUpload size={18} aria-hidden="true" /> Dados deste aparelho sem conta</h2></div>
      <p>
        Este aparelho tem {countText(device.state.attempts.length, 'sessão', 'sessões')}, {countText(device.disciplines.length, 'disciplina', 'disciplinas')} e {countText(device.state.reports?.length ?? 0, 'relato', 'relatos')} salvos fora de qualquer conta.
        {log && ` Você importou para esta conta em ${new Date(log).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`}
      </p>
      <p className="hint">Se o aparelho é compartilhado, confira se esses dados são seus antes de importar.</p>
      <p className="hint">Materiais, guias, questões pessoais e eventos da agenda criados neste aparelho não são importados nesta versão (o PDF não fica guardado aqui para ser conferido no servidor): eles continuam neste aparelho. Na conta, adicione o material de novo.</p>
      {!plan ? (
        <div className="row wrap">
          <button type="button" className="ghost" disabled={busy || l1 || l2} onClick={() => void prepare()}>Ver o que seria importado</button>
          <button type="button" className="text-btn" onClick={() => downloadText(`study-mastery-aparelho-${new Date().toISOString().slice(0, 10)}.json`, exportState(device.state ?? emptyState()))}>Exportar cópia</button>
        </div>
      ) : isEmptyPlan(plan) ? (
        <p className="form-ok" role="status">Nada novo: tudo deste aparelho já está na sua conta.</p>
      ) : (
        <div className="confirm" role="alertdialog" aria-label="Confirmar importação">
          <p>Será enviado para <b>{a.user!.email}</b>:</p>
          <ul className="plain">
            {plan.attempts.length > 0 && <li>{countText(plan.attempts.length, 'sessão concluída', 'sessões concluídas')}</li>}
            {plan.disciplines.length > 0 && <li>{countText(plan.disciplines.length, 'disciplina nova', 'disciplinas novas')} ({plan.disciplines.map((d) => d.name).join(', ')})</li>}
            {plan.merged.length > 0 && <li>Juntadas com a de mesmo nome na conta: {plan.merged.map((m) => m.name).join(', ')}</li>}
            {plan.topics.length > 0 && <li>{countText(plan.topics.length, 'assunto', 'assuntos')}</li>}
            {plan.reports.length > 0 && <li>{countText(plan.reports.length, 'relato de erro', 'relatos de erro')}</li>}
          </ul>
          {Object.values(plan.alreadyThere).some(Boolean) && <p className="hint">Já estavam na conta e serão ignorados: {plan.alreadyThere.attempts} sessões, {plan.alreadyThere.disciplines} disciplinas, {plan.alreadyThere.topics} assuntos.</p>}
          {plan.blocked && <p className="form-error" role="alert">{plan.blocked}</p>}
          <div className="row wrap">
            <button type="button" className="ghost" onClick={() => setPlan(null)}>Cancelar</button>
            <button type="button" className="primary" disabled={busy || !!plan.blocked} onClick={() => void execute()}>{busy ? 'Importando…' : 'Importar para a conta'}</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </section>
  );
}
