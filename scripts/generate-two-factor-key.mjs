/**
 * Gera a chave que cifra os segredos TOTP (2FA) no banco e imprime a variável de ambiente.
 * É segredo: coloque só no .env/secret store do ambiente, nunca no git, e **guarde um backup** —
 * sem ela, quem ativou o 2FA não consegue mais entrar (só os códigos de recuperação não bastam: o login pede o TOTP).
 *
 * Uso: npm run two-factor:key
 */
import { randomBytes } from 'node:crypto'

console.log('Adicione ao .env do ambiente (é segredo; faça backup, sem ela o 2FA existente para de funcionar):\n')
console.log(`TWO_FACTOR_ENCRYPTION_KEY="${randomBytes(32).toString('base64')}"`)
