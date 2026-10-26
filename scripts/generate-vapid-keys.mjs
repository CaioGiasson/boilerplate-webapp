/**
 * Gera um par de chaves VAPID para o Web Push e imprime as variáveis de ambiente.
 * A chave privada é segredo: coloque só no .env/secret store do ambiente, nunca no git.
 *
 * Uso: npm run vapid:keys
 */
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log('Adicione ao .env do ambiente (a chave privada é segredo):\n')
console.log(`VAPID_PUBLIC_KEY="${publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${privateKey}"`)
console.log('VAPID_SUBJECT="mailto:ops@example.com"  # troque por um contato real (mailto: ou https://)')
