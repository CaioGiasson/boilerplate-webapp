import { allocateGoogleNickname, nicknameBaseFromEmail } from '@/utils/googleNickname'
import { NICKNAME_MAX_LENGTH } from '@/utils/nickname'

describe('nicknameBaseFromEmail', () => {
	it('usa a parte local do e-mail', () => {
		expect(nicknameBaseFromEmail('Alice.Doe@example.com')).toBe(
			'alice.doe'.replace('.', '_').length ? 'alice_doe' : ''
		)
		// dots are invalid for nickname charset → underscore
		expect(nicknameBaseFromEmail('Alice.Doe@example.com')).toBe('alice_doe')
	})

	it('substitui símbolos inválidos por _', () => {
		expect(nicknameBaseFromEmail('a+tag@example.com')).toBe('a_tag')
		expect(nicknameBaseFromEmail('nome@exemplo.com')).toBe('nome')
	})

	it('trunca em NICKNAME_MAX_LENGTH', () => {
		const longLocal = 'a'.repeat(50)
		const base = nicknameBaseFromEmail(`${longLocal}@x.com`)
		expect(base.length).toBe(NICKNAME_MAX_LENGTH)
	})

	it('cai em user quando local-part vira vazio', () => {
		expect(nicknameBaseFromEmail('+++@example.com')).toBe('user')
	})
})

describe('allocateGoogleNickname', () => {
	it('retorna a base quando disponível', async () => {
		const nick = await allocateGoogleNickname('bob@example.com', async () => false)
		expect(nick).toBe('bob')
	})

	it('adiciona _ + 8 letras quando a base está ocupada', async () => {
		const taken = new Set(['bob'])
		const nick = await allocateGoogleNickname('bob@example.com', async (candidate) => taken.has(candidate))
		expect(nick).toMatch(/^bob_[a-z]{8}$/)
	})

	it('corta o prefixo para caber _ + 8 letras em nick longo', async () => {
		const longLocal = 'a'.repeat(32)
		const base = nicknameBaseFromEmail(`${longLocal}@x.com`)
		expect(base.length).toBe(32)
		const taken = new Set([base])
		const nick = await allocateGoogleNickname(`${longLocal}@x.com`, async (candidate) => taken.has(candidate))
		expect(nick.length).toBe(32)
		expect(nick).toMatch(/^a{23}_[a-z]{8}$/)
	})
})
