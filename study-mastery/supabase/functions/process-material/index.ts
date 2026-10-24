// POST { materialId } — confere no servidor o material enviado (arquivo real, tamanho, hash e texto completo) e
// define o estado final: Pronto, Precisa de atenção ou Falhou. Pedidos repetidos não refazem o trabalho.
import { cors, isUuid, json, requireUser, serviceClient, userClient } from '../_shared/http.ts';
import { processMaterial, type MaterialRow } from '../_shared/processMaterial.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const user = await requireUser(req);
  if (!user) return json(req, { error: 'Entre na sua conta para continuar.' }, 401);
  let body: { materialId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Corpo inválido.' }, 400);
  }
  if (!isUuid(body.materialId)) return json(req, { error: 'materialId inválido.' }, 400);

  const asUser = userClient(req);
  const admin = serviceClient();
  try {
    const result = await processMaterial(
      {
        async getMaterial(id) {
          const { data, error } = await asUser.from('materials').select('id, owner_id, kind, status, file_size, sha256, page_count, server_checked_at').eq('id', id).maybeSingle();
          if (error) throw error;
          return (data as MaterialRow | null) ?? null;
        },
        async getPages(id) {
          const { data, error } = await asUser.from('material_pages').select('page, text').eq('material_id', id).order('page');
          if (error) throw error;
          return (data ?? []) as { page: number; text: string }[];
        },
        async download(path) {
          const { data, error } = await asUser.storage.from('materiais').download(path);
          if (error || !data) return null;
          return new Uint8Array(await data.arrayBuffer());
        },
        async update(ownerId, id, patch) {
          if (ownerId !== user.id) throw new Error('dono divergente');
          const { error } = await admin.from('materials').update(patch).eq('owner_id', ownerId).eq('id', id);
          if (error) throw error;
        },
        async removeFile(path) {
          if (!path.startsWith(user.id + '/')) throw new Error('caminho fora da pasta do usuário');
          await admin.storage.from('materiais').remove([path]);
        },
        now: () => new Date().toISOString(),
      },
      body.materialId,
    );
    return json(req, result, result.http);
  } catch (e) {
    // sem detalhes internos na resposta; o log do projeto registra a mensagem (sem segredos)
    console.error('process-material', (e as Error).message);
    return json(req, { error: 'Falha temporária ao conferir o material. Tente de novo em instantes.' }, 500);
  }
});
