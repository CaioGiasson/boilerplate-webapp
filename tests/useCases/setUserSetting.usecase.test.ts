jest.mock('@/repositories/User.repository', () => {
	const actual = jest.requireActual(
		'@/repositories/User.repository'
	) as typeof import('@/repositories/User.repository')
	return {
		__esModule: true,
		...actual,
		default: jest.fn().mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({
				id: 'user-1',
				name: null,
				nickname: 'ada',
				email: 'ada@example.com',
				passwordHash: 'hash',
				photoUrl: null,
				settings: [{ key: 'language', value: 'pt' }],
				acceptedTermsAt: null,
				acceptedPrivacyAt: null,
				termsVersion: null,
				privacyVersion: null,
				createdAt: new Date('2026-08-19T00:00:00.000Z'),
				updatedAt: new Date('2026-08-19T00:00:00.000Z'),
				deletedAt: null,
			}),
			updateProfile: jest.fn(async (_id: string, data: { settings?: unknown[] }) => ({
				id: 'user-1',
				name: null,
				nickname: 'ada',
				email: 'ada@example.com',
				passwordHash: 'hash',
				photoUrl: null,
				settings: data.settings ?? [],
				acceptedTermsAt: null,
				acceptedPrivacyAt: null,
				termsVersion: null,
				privacyVersion: null,
				createdAt: new Date('2026-08-19T00:00:00.000Z'),
				updatedAt: new Date('2026-08-19T00:00:00.000Z'),
				deletedAt: null,
			})),
		})),
	}
})

import SetUserSetting from '@/useCases/setUserSetting.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ValidationError } from '@/errors'
import { SETTINGS_KEYS } from '@/managers/Settings.manager'
import UserRepository from '@/repositories/User.repository'

describe('SetUserSetting', () => {
	mockPrismaRuntime({})

	it('rejeita mass assignment e keys perigosas', async () => {
		const useCase = new SetUserSetting()

		await expect(useCase.run({ userId: 'user-1', key: '__proto__', value: true })).rejects.toBeInstanceOf(
			ValidationError
		)
		await expect(useCase.run({ userId: 'user-1', key: 'constructor', value: true })).rejects.toBeInstanceOf(
			ValidationError
		)
		await expect(useCase.run({ userId: 'user-1', key: 'a'.repeat(10_000), value: true })).rejects.toBeInstanceOf(
			ValidationError
		)
		await expect(useCase.run({ userId: 'user-1', key: 'extraFlag', value: true })).rejects.toBeInstanceOf(
			ValidationError
		)
		await expect(
			useCase.run({ userId: 'user-1', key: SETTINGS_KEYS.DARK_MODE, value: 'yes' })
		).rejects.toBeInstanceOf(ValidationError)
		await expect(
			useCase.run({ userId: 'user-1', key: SETTINGS_KEYS.HOME_ZOOM_LEVEL, value: 999 })
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('persiste keys válidas da allowlist', async () => {
		const useCase = new SetUserSetting()
		const result = await useCase.run({ userId: 'user-1', key: SETTINGS_KEYS.DARK_MODE, value: true })

		expect(result.settings).toEqual(
			expect.arrayContaining([
				{ key: SETTINGS_KEYS.LANGUAGE, value: 'pt' },
				{ key: SETTINGS_KEYS.DARK_MODE, value: true },
			])
		)

		const MockedRepository = UserRepository as unknown as jest.Mock
		const instance = MockedRepository.mock.results.at(-1)?.value as {
			updateProfile: jest.Mock
		}
		expect(instance.updateProfile).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({
				settings: expect.arrayContaining([
					{ key: SETTINGS_KEYS.LANGUAGE, value: 'pt' },
					{ key: SETTINGS_KEYS.DARK_MODE, value: true },
				]),
			})
		)
	})

	it('denormaliza hideFromGlobalMosaic ao desativar appearInGlobalMosaic', async () => {
		const useCase = new SetUserSetting()
		await useCase.run({
			userId: 'user-1',
			key: SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC,
			value: false,
		})

		const MockedRepository = UserRepository as unknown as jest.Mock
		const instance = MockedRepository.mock.results.at(-1)?.value as {
			updateProfile: jest.Mock
		}
		expect(instance.updateProfile).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ hideFromGlobalMosaic: true })
		)
	})
})
