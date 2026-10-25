/**
 * Teste de integração com o projeto Supabase REAL (não roda na suíte comum).
 * Precisa de: projeto criado com as migrações e funções publicadas, rede até *.supabase.co e duas contas de teste
 * confirmadas. Tudo por variáveis de ambiente — nunca grave senhas ou chaves em arquivo:
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TEST_A_EMAIL, TEST_A_PASSWORD, TEST_B_EMAIL, TEST_B_PASSWORD
 *   npx tsx tests/integration/supabase-real.ts
 * O que comprova (e os testes locais não): API real (PostgREST), Auth, Storage com limites do bucket e as funções
 * (process-material, generate — só o status e as recusas; a geração com IA depende da chave e tem custo).
 * Limpa o que criou no fim (inclusive arquivos do Storage).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Defina ${k} (veja o comentário no topo do arquivo).`);
    process.exit(2);
  }
  return v;
};
const URL = env('SUPABASE_URL');
const KEY = env('SUPABASE_PUBLISHABLE_KEY');
const FIX = path.resolve(import.meta.dirname, '../fixtures/materiais');

let fails = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => {
  if (!cond) fails++;
  console.log(`  ${cond ? '✓' : '✗'} ${name}${!cond && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`);
};

async function login(email: string, password: string): Promise<{ sb: SupabaseClient; uid: string }> {
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`login de ${email}: ${error?.message}`);
  return { sb, uid: data.user.id };
}

async function main() {
  const A = await login(env('TEST_A_EMAIL'), env('TEST_A_PASSWORD'));
  const B = await login(env('TEST_B_EMAIL'), env('TEST_B_PASSWORD'));
  const disc = crypto.randomUUID();
  const mat = crypto.randomUUID();
  const pdf = fs.readFileSync(path.join(FIX, 'aula-integrais.pdf'));
  const sha = Buffer.from(await crypto.subtle.digest('SHA-256', pdf)).toString('hex');
  try {
    console.log('## Dados da conta A');
    ok('A cria disciplina', !(await A.sb.from('disciplines').insert({ id: disc, name: 'Teste integração', color: 'menta' })).error);
    ok('A cria material PDF', !(await A.sb.from('materials').insert({ id: mat, discipline_id: disc, title: 'Aula', kind: 'pdf', file_name: 'a.pdf', file_size: pdf.length, sha256: sha, page_count: 1 })).error);
    ok('A grava a página extraída', !(await A.sb.from('material_pages').insert({ material_id: mat, page: 1, text: 'Integração por partes '.repeat(40) })).error);
    const up = await A.sb.storage.from('materiais').upload(`${A.uid}/${mat}.pdf`, pdf, { contentType: 'application/pdf' });
    ok('A envia o PDF para a própria pasta', !up.error, up.error?.message);

    console.log('## B tentando usar os mesmos IDs');
    ok('B não lê a disciplina de A', ((await B.sb.from('disciplines').select('*').eq('id', disc)).data ?? []).length === 0);
    ok('B não lê o material nem o texto de A', ((await B.sb.from('materials').select('*').eq('id', mat)).data ?? []).length === 0 && ((await B.sb.from('material_pages').select('*').eq('material_id', mat)).data ?? []).length === 0);
    const upd = await B.sb.from('disciplines').update({ name: 'invadido' }).eq('id', disc).select();
    ok('B não altera (0 linhas)', (upd.data ?? []).length === 0);
    const del = await B.sb.from('materials').delete().eq('id', mat).select();
    ok('B não apaga (0 linhas)', (del.data ?? []).length === 0);
    ok('B não baixa o arquivo de A', !!(await B.sb.storage.from('materiais').download(`${A.uid}/${mat}.pdf`)).error);
    ok('B não envia arquivo para a pasta de A', !!(await B.sb.storage.from('materiais').upload(`${A.uid}/${crypto.randomUUID()}.pdf`, pdf, { contentType: 'application/pdf' })).error);
    const inv = await B.sb.functions.invoke('process-material', { body: { materialId: mat } });
    ok('B pedindo a conferência do material de A recebe "não encontrado"', (inv.error as { context?: Response } | null)?.context?.status === 404);

    console.log('## Servidor: tipo, tamanho e conferência');
    const mat2 = crypto.randomUUID();
    await A.sb.from('materials').insert({ id: mat2, discipline_id: disc, title: 'Falso', kind: 'pdf', file_name: 'f.pdf', file_size: 10, sha256: sha, page_count: 1 });
    ok('bucket recusa tipo diferente de PDF', !!(await A.sb.storage.from('materiais').upload(`${A.uid}/${mat2}.pdf`, Buffer.from('texto'), { contentType: 'text/plain' })).error);
    ok('bucket recusa arquivo acima de 10 MB', !!(await A.sb.storage.from('materiais').upload(`${A.uid}/${mat2}.pdf`, Buffer.alloc(10 * 1024 * 1024 + 10), { contentType: 'application/pdf' })).error);
    const pm = await A.sb.functions.invoke('process-material', { body: { materialId: mat } });
    ok('process-material confere o PDF de A', !pm.error && ['pronto', 'atencao'].includes((pm.data as { status?: string })?.status ?? ''), pm.error?.message ?? pm.data);
    const again = await A.sb.functions.invoke('process-material', { body: { materialId: mat } });
    ok('pedido repetido não refaz o trabalho', (again.data as { reused?: boolean })?.reused === true);
    const forged = await A.sb.from('materials').update({ server_checked_at: new Date().toISOString() }).eq('id', mat2);
    ok('o navegador não consegue marcar "conferido"', !!forged.error);

    console.log('## Guias, questões e agenda: isolamento');
    const topic = crypto.randomUUID();
    const q = crypto.randomUUID();
    const guide = crypto.randomUUID();
    const ev = crypto.randomUUID();
    await A.sb.from('topics').insert({ id: topic, discipline_id: disc, name: 'Integração por partes', position: 0, origin: 'manual' });
    ok('A cria questão pessoal ligada ao material', !(await A.sb.from('questions').insert({ id: q, discipline_id: disc, topic_id: topic, status: 'criada_aluno', difficulty: 'medio', material_ids: [mat], data: { stem: 'Questão de teste' } })).error);
    ok('A cria guia', !(await A.sb.from('guides').insert({ id: guide, discipline_id: disc, title: 'Guia', material_ids: [mat], data: { topicIds: [topic], allowComplement: false, sectionKinds: [], sections: {} } })).error);
    ok('A cria evento', !(await A.sb.from('events').insert({ id: ev, discipline_id: disc, type: 'prova', title: 'P1', status: 'agendado', all_day: true, date: '2026-11-20', time_zone: 'America/Sao_Paulo' })).error);
    for (const [t, id] of [['questions', q], ['guides', guide], ['events', ev]] as const) {
      ok(`B não lê ${t} de A`, ((await B.sb.from(t).select('*').eq('id', id)).data ?? []).length === 0);
      ok(`B não altera nem apaga ${t} de A`, ((await B.sb.from(t).update({ updated_at: new Date().toISOString() }).eq('id', id).select()).data ?? []).length === 0 && ((await B.sb.from(t).delete().eq('id', id).select()).data ?? []).length === 0);
    }
    await B.sb.rpc('set_guide_section', { p_guide: guide, p_key: 'x:resumo', p_patch: { items: [{ title: 'invadido' }] } });
    ok('B não escreve seção no guia de A', !JSON.stringify((await A.sb.from('guides').select('data').eq('id', guide)).data).includes('invadido'));
    const bc = await B.sb.rpc('delete_material_cascade', { p_material: mat });
    ok('B chamando a exclusão em cascata com o material de A não apaga nada', JSON.stringify(bc.data) === JSON.stringify({ questoes: 0, guias: 0 }) && ((await A.sb.from('questions').select('id').eq('id', q)).data ?? []).length === 1);
    ok('A não grava tarefas de geração (só o servidor)', !!(await A.sb.from('jobs').insert({ owner_id: A.uid, id: crypto.randomUUID(), kind: 'questoes', idem_key: 'a'.repeat(64), status: 'done' })).error);
    const st = await A.sb.functions.invoke('generate', { body: { op: 'status' } });
    ok('generate responde o status (IA configurada ou não, sem simular)', !st.error && typeof (st.data as { ia?: boolean })?.ia === 'boolean', st.error?.message ?? st.data);
    const anon = createClient(URL, KEY, { auth: { persistSession: false } });
    ok('generate recusa quem não entrou na conta', !!(await anon.functions.invoke('generate', { body: { op: 'status' } })).error);
    const foreign = await B.sb.functions.invoke('generate', { body: { op: 'secao', guideId: guide, topicId: topic, kind: 'resumo' } });
    const fs404 = (foreign.error as { context?: Response } | null)?.context?.status;
    ok('B pedindo geração no guia de A: não encontrado (ou IA não configurada)', fs404 === 404 || fs404 === 503, fs404);

    console.log('## Exclusão do material leva questões e guias derivados');
    const cas = await A.sb.rpc('delete_material_cascade', { p_material: mat });
    ok('delete_material_cascade remove 1 questão e 1 guia', JSON.stringify(cas.data) === JSON.stringify({ questoes: 1, guias: 1 }), cas.data ?? cas.error);
    ok('evento continua (é a agenda do estudante)', ((await A.sb.from('events').select('id').eq('id', ev)).data ?? []).length === 1);

    console.log('## Exclusão também no Storage');
    await A.sb.storage.from('materiais').remove([`${A.uid}/${mat}.pdf`]);
    await A.sb.from('materials').delete().eq('id', mat);
    const list = await A.sb.storage.from('materiais').list(A.uid, { search: mat });
    ok('arquivo excluído não existe mais no Storage', (list.data ?? []).length === 0);
    ok('texto extraído excluído junto', ((await A.sb.from('material_pages').select('*').eq('material_id', mat)).data ?? []).length === 0);
  } finally {
    await A.sb.storage.from('materiais').remove([`${A.uid}/${mat}.pdf`]);
    await A.sb.from('disciplines').delete().eq('id', disc);
  }
  console.log(fails ? `\n${fails} falha(s)` : '\nIntegração real: tudo ok');
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
