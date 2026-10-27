/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ProfileTwoFactorSection } from '@/components/auth/ProfileTwoFactorSection'
import { AccordionGroup } from '@/design-system/AccordionSection'
import { ApiClientError } from '@/lib/api-error'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const getTwoFactorStatusRequest = jest.fn()
const beginTwoFactorSetupRequest = jest.fn()
const enableTwoFactorRequest = jest.fn()
const disableTwoFactorRequest = jest.fn()
const regenerateRecoveryCodesRequest = jest.fn()
const toast = jest.fn()

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key,
}))
jest.mock('@/i18n/navigation', () => ({
	Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
	usePathname: () => '/',
	useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/design-system/Toast', () => ({
	useToast: () => ({ toast }),
	ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('@/lib/auth-client', () => ({
	getTwoFactorStatusRequest: (...args: unknown[]) => getTwoFactorStatusRequest(...args),
	beginTwoFactorSetupRequest: (...args: unknown[]) => beginTwoFactorSetupRequest(...args),
	enableTwoFactorRequest: (...args: unknown[]) => enableTwoFactorRequest(...args),
	disableTwoFactorRequest: (...args: unknown[]) => disableTwoFactorRequest(...args),
	regenerateRecoveryCodesRequest: (...args: unknown[]) => regenerateRecoveryCodesRequest(...args),
}))

const OFF = { available: true, enabled: false, recoveryCodesRemaining: 0 }
const ON = { available: true, enabled: true, recoveryCodesRemaining: 7 }

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()
	})
}

function mount() {
	return renderInJsdom(
		<AccordionGroup value="two-factor" onValueChange={() => undefined}>
			<ProfileTwoFactorSection />
		</AccordionGroup>
	)
}

function type(input: Element | null | undefined, value: string) {
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
		setter?.call(input, value)
		input?.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

function click(element: Element | null | undefined) {
	act(() => {
		element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
}

const button = (container: HTMLElement, label: string) =>
	Array.from(container.querySelectorAll('button')).find((item) => item.textContent === label)

describe('ProfileTwoFactorSection', () => {
	beforeEach(() => {
		for (const mock of [
			getTwoFactorStatusRequest,
			beginTwoFactorSetupRequest,
			enableTwoFactorRequest,
			disableTwoFactorRequest,
			regenerateRecoveryCodesRequest,
			toast,
		]) {
			mock.mockReset()
		}
	})

	it('some quando o servidor não tem a chave de cifra e a conta não usa 2FA', async () => {
		getTwoFactorStatusRequest.mockResolvedValue({ available: false, enabled: false, recoveryCodesRemaining: 0 })

		const { container, unmount } = mount()
		await flush()

		expect(container.textContent).toBe('')
		unmount()
	})

	it('mostra erro de carregamento', async () => {
		getTwoFactorStatusRequest.mockRejectedValue(new Error('boom'))

		const { container, unmount } = mount()
		await flush()

		expect(container.textContent).toContain('twoFactorLoadError')
		unmount()
	})

	it('ativar: mostra a chave, confirma com 6 dígitos, mostra os códigos de recuperação e recarrega', async () => {
		getTwoFactorStatusRequest.mockResolvedValueOnce(OFF).mockResolvedValueOnce(ON)
		beginTwoFactorSetupRequest.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' })
		enableTwoFactorRequest.mockResolvedValue({ recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] })
		const { container, unmount } = mount()
		await flush()

		click(button(container, 'twoFactorEnable'))
		await flush()
		expect(container.querySelector('[data-testid="two-factor-secret"]')?.textContent).toBe('JBSWY3DPEHPK3PXP')
		expect(container.querySelector('a')?.getAttribute('href')).toBe('otpauth://totp/x')
		expect((button(container, 'twoFactorConfirm') as HTMLButtonElement).disabled).toBe(true)

		type(container.querySelector('input'), '12a34b56')
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('123456')
		click(button(container, 'twoFactorConfirm'))
		await flush()

		expect(enableTwoFactorRequest).toHaveBeenCalledWith('123456')
		expect(container.querySelector('[data-testid="two-factor-codes"]')?.textContent).toContain('AAAAA-BBBBB')

		click(button(container, 'twoFactorRecoveryDone'))
		await flush()
		expect(container.querySelector('[data-testid="two-factor-codes"]')).toBeNull()
		expect(container.textContent).toContain('twoFactorStatusOn')
		unmount()
	})

	it('código inválido no setup mostra o erro e não avança', async () => {
		getTwoFactorStatusRequest.mockResolvedValue(OFF)
		beginTwoFactorSetupRequest.mockResolvedValue({ secret: 'S', otpauthUri: 'otpauth://totp/x' })
		enableTwoFactorRequest.mockRejectedValue(new ApiClientError('bad', 'INVALID_TWO_FACTOR_CODE', 'generic', 400))
		const { container, unmount } = mount()
		await flush()
		click(button(container, 'twoFactorEnable'))
		await flush()

		type(container.querySelector('input'), '000000')
		click(button(container, 'twoFactorConfirm'))
		await flush()

		expect(container.querySelector('[data-testid="two-factor-error"]')?.textContent).toBe('twoFactorInvalidCode')
		expect(container.querySelector('[data-testid="two-factor-codes"]')).toBeNull()
		unmount()
	})

	it('ativo: mostra quantos códigos restam e desativa com senha e código', async () => {
		getTwoFactorStatusRequest.mockResolvedValueOnce(ON).mockResolvedValueOnce(OFF)
		disableTwoFactorRequest.mockResolvedValue({ ok: true })
		const { container, unmount } = mount()
		await flush()

		expect(container.textContent).toContain('twoFactorRecoveryRemaining:{"count":7}')
		click(button(container, 'twoFactorDisable'))
		const [password, code] = Array.from(container.querySelectorAll('input'))
		expect((button(container, 'twoFactorDisableConfirm') as HTMLButtonElement).disabled).toBe(true)

		type(password, 'Senha#12345')
		type(code, '123456')
		click(button(container, 'twoFactorDisableConfirm'))
		await flush()

		expect(disableTwoFactorRequest).toHaveBeenCalledWith({ password: 'Senha#12345', code: '123456' })
		expect(container.textContent).toContain('twoFactorStatusOff')
		unmount()
	})

	it('desativar com código de recuperação envia recoveryCode no lugar do código', async () => {
		getTwoFactorStatusRequest.mockResolvedValue(ON)
		disableTwoFactorRequest.mockResolvedValue({ ok: true })
		const { container, unmount } = mount()
		await flush()
		click(button(container, 'twoFactorDisable'))
		const [password, , recovery] = Array.from(container.querySelectorAll('input'))

		type(password, 'Senha#12345')
		type(recovery, 'ABCDE-FGHIJ')
		click(button(container, 'twoFactorDisableConfirm'))
		await flush()

		expect(disableTwoFactorRequest).toHaveBeenCalledWith({ password: 'Senha#12345', recoveryCode: 'ABCDE-FGHIJ' })
		unmount()
	})

	it('gerar novos códigos pede o código do app e mostra os novos', async () => {
		getTwoFactorStatusRequest.mockResolvedValue(ON)
		regenerateRecoveryCodesRequest.mockResolvedValue({ recoveryCodes: ['NNNNN-OOOOO'] })
		const { container, unmount } = mount()
		await flush()
		click(button(container, 'twoFactorRegenerate'))

		type(container.querySelector('input'), '654321')
		click(button(container, 'twoFactorRegenerate'))
		await flush()

		expect(regenerateRecoveryCodesRequest).toHaveBeenCalledWith('654321')
		expect(container.querySelector('[data-testid="two-factor-codes"]')?.textContent).toContain('NNNNN-OOOOO')
		unmount()
	})
})
