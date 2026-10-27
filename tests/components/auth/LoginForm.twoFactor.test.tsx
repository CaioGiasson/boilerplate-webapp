/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { ApiClientError } from '@/lib/api-error'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const loginRequest = jest.fn()
const verifyTwoFactorLoginRequest = jest.fn()
const setUser = jest.fn()
const push = jest.fn()
const replace = jest.fn()
const toast = jest.fn()

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))
jest.mock('@/i18n/navigation', () => ({
	Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
	usePathname: () => '/',
	useRouter: () => ({ push, replace }),
}))
jest.mock('@/design-system/Toast', () => ({
	useToast: () => ({ toast }),
	ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ setUser }) }))
jest.mock('@/components/theme-provider', () => ({ useTheme: () => ({ setTheme: jest.fn() }) }))
jest.mock('@/components/auth/ContinueWithGoogleButton', () => ({ ContinueWithGoogleButton: () => null }))
jest.mock('@/components/legal/LegalLinks', () => ({ LegalLinks: () => null }))
jest.mock('@/lib/auth-client', () => ({
	loginRequest: (...args: unknown[]) => loginRequest(...args),
	verifyTwoFactorLoginRequest: (...args: unknown[]) => verifyTwoFactorLoginRequest(...args),
	applyCloudSettingsToLocal: () => ({}),
}))

const SESSION = { user: { id: 'u1' }, settings: [] }

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
	})
}

function type(input: Element | null, value: string) {
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
		setter?.call(input, value)
		input?.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

function submit(form: Element | null) {
	act(() => {
		form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
	})
}

function click(element: Element | null | undefined) {
	act(() => {
		element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
}

async function reachSecondStep(container: HTMLElement) {
	loginRequest.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge-1' })
	const [identifier, password] = Array.from(container.querySelectorAll('input'))
	type(identifier, 'ada')
	type(password, 'Senha#12345')
	submit(container.querySelector('form'))
	await flush()
}

describe('LoginForm com 2FA', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		for (const mock of [loginRequest, verifyTwoFactorLoginRequest, setUser, push, replace, toast]) mock.mockReset()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('senha certa em conta com 2FA troca para o código e não abre sessão', async () => {
		const { container, unmount } = renderInJsdom(<LoginForm />)

		await reachSecondStep(container)

		expect(container.querySelector('[data-testid="login-two-factor"]')).not.toBeNull()
		expect(container.querySelector('[data-testid="login-page"]')).toBeNull()
		expect(container.textContent).toContain('twoFactorHint')
		expect(setUser).not.toHaveBeenCalled()
		unmount()
	})

	it('envia o código com o challengeToken e abre a sessão', async () => {
		verifyTwoFactorLoginRequest.mockResolvedValue(SESSION)
		const { container, unmount } = renderInJsdom(<LoginForm />)
		await reachSecondStep(container)

		type(container.querySelector('input'), '123456')
		submit(container.querySelector('form'))
		await flush()

		expect(verifyTwoFactorLoginRequest).toHaveBeenCalledWith({ challengeToken: 'challenge-1', code: '123456' })
		expect(setUser).toHaveBeenCalledWith(SESSION.user)
		act(() => {
			jest.advanceTimersByTime(600)
		})
		expect(push).toHaveBeenCalledWith('/')
		unmount()
	})

	it('alterna para o código de recuperação e o envia no campo certo', async () => {
		verifyTwoFactorLoginRequest.mockResolvedValue(SESSION)
		const { container, unmount } = renderInJsdom(<LoginForm />)
		await reachSecondStep(container)

		click(
			Array.from(container.querySelectorAll('button')).find(
				(button) => button.textContent === 'twoFactorUseRecovery'
			)
		)
		expect(container.textContent).toContain('twoFactorRecoveryHint')
		type(container.querySelector('input'), 'ABCDE-FGHIJ')
		submit(container.querySelector('form'))
		await flush()

		expect(verifyTwoFactorLoginRequest).toHaveBeenCalledWith({
			challengeToken: 'challenge-1',
			recoveryCode: 'ABCDE-FGHIJ',
		})
		unmount()
	})

	it('código errado mostra o erro e continua na etapa do código', async () => {
		verifyTwoFactorLoginRequest.mockRejectedValue(new ApiClientError('nope', 'UNAUTHORIZED', 'unauthorized', 401))
		const { container, unmount } = renderInJsdom(<LoginForm />)
		await reachSecondStep(container)

		type(container.querySelector('input'), '000000')
		submit(container.querySelector('form'))
		await flush()

		expect(container.querySelector('[data-testid="login-feedback"]')?.textContent).toBe('twoFactorInvalid')
		expect(container.querySelector('[data-testid="login-two-factor"]')).not.toBeNull()
		expect(setUser).not.toHaveBeenCalled()
		unmount()
	})

	it('Voltar descarta o desafio e mostra o formulário de senha', async () => {
		const { container, unmount } = renderInJsdom(<LoginForm />)
		await reachSecondStep(container)

		click(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'twoFactorBack'))

		expect(container.querySelector('[data-testid="login-page"]')).not.toBeNull()
		expect(container.querySelector('[data-testid="login-two-factor"]')).toBeNull()
		unmount()
	})

	it('conta sem 2FA entra direto, como antes', async () => {
		loginRequest.mockResolvedValue(SESSION)
		const { container, unmount } = renderInJsdom(<LoginForm />)
		const [identifier, password] = Array.from(container.querySelectorAll('input'))
		type(identifier, 'ada')
		type(password, 'Senha#12345')

		submit(container.querySelector('form'))
		await flush()

		expect(setUser).toHaveBeenCalledWith(SESSION.user)
		expect(verifyTwoFactorLoginRequest).not.toHaveBeenCalled()
		unmount()
	})
})
