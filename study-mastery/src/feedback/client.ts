export type FeedbackKind = 'question' | 'bug' | 'suggestion';
export type FeedbackImage = { name: string; dataUrl: string };
export type FeedbackDraft = {
  id: string; kind: FeedbackKind; message: string; questionId?: string; questionVersion?: number;
  appVersion: string; page: string; images: FeedbackImage[];
};
export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
export type FeedbackItem = FeedbackDraft & { createdAt: string; status: FeedbackStatus; note: string; imageCount: number };
export const STATUS_LABEL: Record<FeedbackStatus, string> = { new: 'Novo', reviewing: 'Em análise', resolved: 'Resolvido', dismissed: 'Encerrado sem alteração' };
export const KIND_LABEL: Record<FeedbackKind, string> = { question: 'Erro em questão', bug: 'Problema no site', suggestion: 'Sugestão de melhoria' };

export function newDraft(context: { questionId?: string; questionVersion?: number; page?: string } = {}): FeedbackDraft {
  return { id: crypto.randomUUID(), kind: context.questionId ? 'question' : 'bug', message: '',
    questionId: context.questionId, questionVersion: context.questionVersion,
    appVersion: __APP_VERSION__, page: (context.page ?? (context.questionId ? '#/quiz' : location.hash || '#/')).split('?')[0].slice(0, 100), images: [] };
}

export async function feedbackRequest<T>(query: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(new URL('api/feedback' + query, document.baseURI), {
      ...init, headers, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Não foi possível confirmar o envio ou acessar a caixa. Confira a conexão e tente novamente.');
  }
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error('A caixa de feedbacks ainda não está disponível neste endereço.');
  }
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'Não foi possível concluir a operação.');
  return value as T;
}

export async function getFeedbackConfig(): Promise<{ enabled: boolean; siteKey?: string }> {
  const config = await feedbackRequest<{ enabled?: unknown; siteKey?: unknown }>('?action=config');
  return { enabled: config.enabled === true && typeof config.siteKey === 'string', siteKey: typeof config.siteKey === 'string' ? config.siteKey : undefined };
}
export async function sendFeedback(draft: FeedbackDraft, turnstileToken: string): Promise<{ id: string }> {
  const result = await feedbackRequest<{ id?: unknown }>('', { method: 'POST', body: JSON.stringify({ ...draft, turnstileToken }) });
  if (result.id !== draft.id) throw new Error('O servidor não confirmou o protocolo. Preserve o rascunho e tente novamente.');
  return { id: result.id as string };
}

const DB = 'study-mastery-feedback';
async function draftStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Este navegador não permite guardar rascunhos.'));
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('drafts');
    open.onerror = () => reject(new Error('Não foi possível abrir o armazenamento de rascunhos.'));
    open.onsuccess = () => resolve(open.result);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode);
    const req = operation(tx.objectStore('drafts'));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Não foi possível guardar o rascunho. O espaço do navegador pode estar cheio.')); };
  });
}
export async function loadDraft(): Promise<FeedbackDraft | null> { return (await draftStore('readonly', s => s.get('current'))) ?? null; }
export async function saveDraft(draft: FeedbackDraft): Promise<void> { await draftStore('readwrite', s => s.put(draft, 'current')); }
export async function clearDraft(): Promise<void> { await draftStore('readwrite', s => s.delete('current')); }

/** Decode and re-encode screenshots: original metadata and original filenames are not sent. */
export async function prepareImage(file: File): Promise<FeedbackImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha um print PNG, JPG ou WebP.');
  if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error('Cada arquivo deve ter até 10 MB e não pode estar vazio.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Não foi possível ler esta imagem.')); img.src = url; });
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40_000_000) throw new Error('Imagem muito grande. Recorte a parte que mostra o problema.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador não consegue preparar imagens.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.startsWith('data:image/jpeg;base64,') && (dataUrl.split(',')[1].length * 3 / 4) <= 200 * 1024) {
        return { name: 'print.jpg', dataUrl };
      }
    }
    throw new Error('O print ficou grande demais. Recorte a parte importante e tente novamente.');
  } finally { URL.revokeObjectURL(url); }
}
