// Provedor de IA das Edge Functions: SDK oficial da Anthropic, chave só no servidor (secret ANTHROPIC_API_KEY).
// Saída estruturada (json_schema) e, em caso de recusa pelos filtros de segurança, fallback automático do servidor.
import Anthropic from 'npm:@anthropic-ai/sdk@1.2.0';
import { AiError, type AiLike } from './generateCore.ts';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** null quando não há chave configurada: o app mostra a geração como indisponível, sem simular nada. */
export function providerFromEnv(): AiLike | null {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;
  const model = Deno.env.get('AI_MODEL') || 'claude-opus-5-5';
  const effort = (Deno.env.get('AI_EFFORT') || 'high') as Effort;
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 });
  return {
    model,
    async generate({ system, user, schema }) {
      let msg;
      try {
        // streaming evita tempo limite de HTTP em respostas longas; finalMessage() junta tudo no fim
        const stream = client.beta.messages.stream({
          model,
          max_tokens: 32000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system,
          messages: [{ role: 'user', content: user }],
          output_config: { effort, format: { type: 'json_schema', schema } },
        });
        msg = await stream.finalMessage();
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new AiError('O provedor de IA está com muitas solicitações agora. Tente de novo em alguns minutos.', 'limite', true);
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError('A chave de IA do servidor é inválida ou foi revogada. Avise o responsável pelo Study Mastery.', 'indisponivel', false);
        if (e instanceof Anthropic.BadRequestError) throw new AiError('O pedido de geração foi recusado pelo provedor (formato). Avise o responsável pelo Study Mastery.', 'indisponivel', false);
        if (e instanceof Anthropic.APIError) throw new AiError(`O provedor de IA está indisponível (erro ${e.status ?? 'de rede'}). Tente de novo mais tarde.`, 'indisponivel', true);
        throw new AiError('Não foi possível falar com o provedor de IA. Tente de novo mais tarde.', 'indisponivel', true);
      }
      if (msg.stop_reason === 'refusal') throw new AiError('O provedor de IA recusou gerar este conteúdo. Revise o material escolhido.', 'recusa', false);
      if (msg.stop_reason === 'max_tokens') throw new AiError('A resposta da IA veio incompleta. Tente um lote menor.', 'incompleta', true);
      const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new AiError('A resposta da IA veio fora do formato esperado. Tente de novo.', 'formato', true);
      }
      const u = msg.usage;
      return { json, model: msg.model, usage: { input: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens } };
    },
  };
}
