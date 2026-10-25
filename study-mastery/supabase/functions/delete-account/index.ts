// POST { confirmar: "EXCLUIR" } — apaga os arquivos do usuário no Storage e a conta (o banco apaga o resto em
// cascata: disciplinas, materiais, textos, guias, questões, eventos, progresso e relatos).
import { cors, json, requireUser, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const user = await requireUser(req);
  if (!user) return json(req, { error: 'Entre na sua conta para continuar.' }, 401);
  const body = await req.json().catch(() => ({}));
  if ((body as { confirmar?: string }).confirmar !== 'EXCLUIR') return json(req, { error: 'Confirmação ausente.' }, 400);
  const admin = serviceClient();
  try {
    let removed = 0;
    for (;;) {
      const { data, error } = await admin.storage.from('materiais').list(user.id, { limit: 100 });
      if (error) throw error;
      if (!data?.length) break;
      const paths = data.map((f) => `${user.id}/${f.name}`);
      const { error: re } = await admin.storage.from('materiais').remove(paths);
      if (re) throw re;
      removed += paths.length;
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json(req, { ok: true, arquivosRemovidos: removed });
  } catch (e) {
    console.error('delete-account', (e as Error).message);
    return json(req, { error: 'Não foi possível concluir a exclusão. Arquivos podem já ter sido removidos, mas a conta e os dados no banco continuam; tente de novo.' }, 500);
  }
});
