// Conferência de um material no servidor (Edge Function process-material). Sem dependências de plataforma:
// o acesso a banco e Storage chega por `deps`, para testar a regra sem rede.
import { analyzeMaterial, looksLikePdf, pdfEncrypted, sha256Hex, type MaterialIssue, type PageText } from './materialQuality.ts';

export interface MaterialRow {
  id: string;
  owner_id: string;
  kind: 'pdf' | 'texto';
  status: string;
  file_size: number | null;
  sha256: string | null;
  page_count: number;
  server_checked_at: string | null;
}

export interface ProcessDeps {
  /** lido com o JWT do usuário: o RLS garante que é dele */
  getMaterial(id: string): Promise<MaterialRow | null>;
  getPages(id: string): Promise<PageText[]>;
  download(path: string): Promise<Uint8Array | null>;
  /** gravado com a chave do servidor, sempre filtrando por owner_id e id */
  update(ownerId: string, id: string, patch: Record<string, unknown>): Promise<void>;
  removeFile(path: string): Promise<void>;
  now(): string;
}

export interface ProcessResult {
  http: number;
  status?: 'pronto' | 'atencao' | 'falhou';
  issues?: MaterialIssue[];
  detail?: string;
  reused?: boolean;
  error?: string;
}

export const storagePath = (ownerId: string, id: string) => `${ownerId}/${id}.pdf`;

export async function processMaterial(deps: ProcessDeps, materialId: string): Promise<ProcessResult> {
  const m = await deps.getMaterial(materialId);
  if (!m) return { http: 404, error: 'Material não encontrado nesta conta.' };
  // já conferido e sem mudança de texto desde então: não refaz nada (pedido repetido)
  if (m.server_checked_at && (m.status === 'pronto' || m.status === 'atencao')) return { http: 200, status: m.status, reused: true };

  const fail = async (detail: string, removeFile = false): Promise<ProcessResult> => {
    if (removeFile) await deps.removeFile(storagePath(m.owner_id, m.id));
    await deps.update(m.owner_id, m.id, { status: 'falhou', status_detail: detail });
    return { http: 422, status: 'falhou', detail };
  };

  const pages = await deps.getPages(m.id);
  const complete = pages.length === m.page_count && pages.every((p, i) => p.page === i + 1);
  if (!complete) return fail(`O texto extraído chegou incompleto (${pages.length} de ${m.page_count} páginas). Tente de novo.`);

  if (m.kind === 'pdf') {
    const bytes = await deps.download(storagePath(m.owner_id, m.id));
    if (!bytes) return fail('O arquivo não chegou ao servidor. Tente enviar de novo.');
    if (bytes.byteLength !== m.file_size) return fail('O arquivo recebido tem tamanho diferente do informado. Envie de novo.', true);
    if (!looksLikePdf(bytes)) return fail('O arquivo recebido não é um PDF.', true);
    if (pdfEncrypted(bytes)) return fail('O PDF está protegido por senha.', true);
    if ((await sha256Hex(bytes)) !== m.sha256) return fail('O arquivo recebido é diferente do que foi lido no aparelho. Envie de novo.', true);
  }

  const a = analyzeMaterial(pages, m.kind);
  await deps.update(m.owner_id, m.id, { status: a.status, status_detail: null, issues: a.issues, char_count: a.charCount, server_checked_at: deps.now() });
  return { http: 200, status: a.status, issues: a.issues };
}
