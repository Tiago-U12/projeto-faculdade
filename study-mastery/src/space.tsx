import { useMemo, type ReactNode } from 'react';
import { useAccount } from './account';
import { ProgressSync } from './cloud/ProgressSync';
import type { Bank } from './lib/bank';
import { accountStateKey, browserStore, loadState, STATE_KEY } from './lib/storage';
import { idbBackend, memoryBackend, type KvBackend } from './personal/backend';
import { PersonalProvider } from './personal/context';
import { CloudRepo, LocalRepo, type PersonalRepo, type TableClient } from './personal/repo';
import { StudyProvider } from './state';

export const DEVICE_DB = 'study-mastery-personal';

function deviceKv(): KvBackend {
  return 'indexedDB' in globalThis ? idbBackend(DEVICE_DB) : memoryBackend();
}

/**
 * Escolhe o espaço de dados: sem conta → "neste aparelho"; com conta → dados da conta (com cache do progresso).
 * Trocar de espaço remonta os provedores: nada de um espaço vaza para o outro.
 */
export function SpaceRoot({ bank, children }: { bank: Bank; children: ReactNode }) {
  const account = useAccount();
  const uid = account.status === 'signedIn' ? account.user!.id : null;
  const email = account.user?.email ?? '';
  const kv = useMemo(() => (uid ? undefined : deviceKv()), [uid]);
  const repo = useMemo<PersonalRepo | null>(() => {
    if (!uid) return new LocalRepo(kv!);
    return null;
  }, [uid, kv]);
  const cloudRepo = useMemo(() => (uid ? lazyCloudRepo(account.client, uid, email) : null), [uid, email, account.client]);

  if (account.status === 'loading') return <p className="boot" role="status">Verificando sua conta…</p>;
  if (!uid) {
    return (
      <StudyProvider key="device" bank={bank}>
        <PersonalProvider key="device" repo={repo!} kv={kv}>
          {children}
        </PersonalProvider>
      </StudyProvider>
    );
  }
  const deviceSettings = loadState(browserStore(), STATE_KEY).settings;
  return (
    <StudyProvider key={uid} bank={bank} stateKey={accountStateKey(uid)} account initialSettings={deviceSettings}>
      <ProgressSync uid={uid}>
        <PersonalProvider key={uid} repo={cloudRepo!}>
          {children}
        </PersonalProvider>
      </ProgressSync>
    </StudyProvider>
  );
}

/** CloudRepo que obtém o cliente do Supabase sob demanda (o pacote é carregado só para quem usa conta). */
function lazyCloudRepo(client: () => Promise<unknown>, uid: string, email: string): PersonalRepo {
  let inner: Promise<CloudRepo> | null = null;
  const get = () => (inner ??= client().then((sb) => new CloudRepo(sb as TableClient, uid, email)));
  return {
    space: { kind: 'account', uid, email },
    list: async (kind) => (await get()).list(kind),
    put: async (kind, e) => (await get()).put(kind, e),
    putMany: async (kind, es, opts) => (await get()).putMany(kind, es, opts),
    remove: async (kind, ids) => (await get()).remove(kind, ids),
  };
}
