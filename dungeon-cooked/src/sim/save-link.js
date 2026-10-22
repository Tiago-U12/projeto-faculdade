// Link de continuar: o save inteiro, compactado, dentro do endereço do jogo
// (#continuar=...). Leva o progresso para outro aparelho sem servidor e sem conta.
// O trecho depois de "#" não é enviado ao servidor que hospeda o jogo.
import { parseImport } from './save.js';

export const LINK_PARAM = 'continuar';
export const PUBLIC_URL = 'https://tiago-u12.github.io/projeto-faculdade/dungeon-cooked/';
const CODE_PREFIX = 'DC1';
const DEFLATE = 'z';
const PLAIN = 'j';
const MAX_CODE_CHARS = 200_000;
const MAX_JSON_BYTES = 2_000_000;

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function canCompress() {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
}

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Descompacta com limite de tamanho (um link adulterado não pode inflar sem fim).
async function inflate(bytes, limit) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// file: arquivo de save completo (já validado). Sem compressão disponível, o código só fica maior.
export async function encodeSaveCode(file, { compress = canCompress(), now = new Date().toISOString() } = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...file, exportedAt: now }));
  if (compress) return `${CODE_PREFIX}${DEFLATE}${toBase64Url(await deflate(bytes))}`;
  return `${CODE_PREFIX}${PLAIN}${toBase64Url(bytes)}`;
}

export async function decodeSaveCode(code) {
  if (typeof code !== 'string' || !code.startsWith(CODE_PREFIX)) return { ok: false, error: 'não é um link de continuar' };
  if (code.length > MAX_CODE_CHARS) return { ok: false, error: 'link grande demais' };
  const kind = code[CODE_PREFIX.length];
  const bytes = fromBase64Url(code.slice(CODE_PREFIX.length + 1));
  if (!bytes || !bytes.length) return { ok: false, error: 'link incompleto ou alterado' };
  let json = bytes;
  if (kind === DEFLATE) {
    if (!canCompress()) return { ok: false, error: 'este navegador é antigo demais para abrir o link; atualize-o ou use Exportar save' };
    try {
      json = await inflate(bytes, MAX_JSON_BYTES);
    } catch {
      return { ok: false, error: 'link incompleto ou alterado' };
    }
    if (!json) return { ok: false, error: 'link grande demais' };
  } else if (kind !== PLAIN) {
    return { ok: false, error: 'formato de link desconhecido' };
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(json);
  } catch {
    return { ok: false, error: 'link incompleto ou alterado' };
  }
  return parseImport(text);
}

// Aceita o link inteiro, só o trecho "#continuar=..." ou o código puro. Apps de
// mensagem às vezes quebram linhas no meio: espaços são ignorados.
export function extractSaveCode(text) {
  if (typeof text !== 'string') return null;
  const compact = text.replace(/\s+/g, '');
  const marker = `${LINK_PARAM}=`;
  const at = compact.indexOf(marker);
  const raw = at >= 0 ? compact.slice(at + marker.length).split(/[&#?]/)[0] : compact;
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    // mantém como veio
  }
  return code.startsWith(CODE_PREFIX) ? code : null;
}

export function continueLink(code, base = PUBLIC_URL) {
  return `${base.split('#')[0]}#${LINK_PARAM}=${code}`;
}
