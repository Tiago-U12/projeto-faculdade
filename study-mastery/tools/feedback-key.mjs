// Execute somente no seu computador. Não cole o resultado em chat, commits ou relatos.
import { createHash, randomBytes } from 'node:crypto';
const token = randomBytes(32).toString('base64url');
console.log('Guarde esta chave no seu gerenciador de senhas; use-a para abrir a caixa privada:');
console.log(token);
console.log('\nConfigure APENAS este hash na secret FEEDBACK_ADMIN_TOKEN_SHA256 do Cloudflare Pages:');
console.log(createHash('sha256').update(token).digest('hex'));
