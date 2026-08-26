jest.mock('@/repositories/Image.repository', () => {
	return {
		__esModule: true,
		default: jest.fn(),
	}
})

jest.mock('@/repositories/Report.repository', () => {
	return {
		__esModule: true,
		default: jest.fn(),
		isUniqueConstraintError: jest.requireActual('@/repositories/User.repository').isUniqueConstraintError,
	}
})

jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}))

import ReportImage from '@/useCases/reportImage.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import ImageRepository from '@/repositories/Image.repository'
import ReportRepository from '@/repositories/Report.repository'
import { ConflictError, NotFoundError, ValidationError } from '@/errors'
import { Visibility } from '@/constants/visibility'
import LogManager from '@/managers/Log.manager'

describe('ReportImage', () => {
	mockPrismaRuntime({})

	const image = {
		id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
		ownerId: 'owner-1',
		url: 'https://example.com/a.jpg',
		title: 'A',
		description: null,
		tags: [],
		fileId: null,
		visibility: Visibility.PUBLIC,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		;(ImageRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(image),
		}))
		;(ReportRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByImageAndReporter: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockResolvedValue({
				id: 'report-1',
				imageId: image.id,
				reporterId: 'reporter-1',
				reason: 'spam',
				details: null,
				status: 'open',
				createdAt: new Date('2026-08-20T00:00:00.000Z'),
			}),
		}))
	})

	it('cria denúncia com 201 semantics (retorno do use case)', async () => {
		const useCase = new ReportImage()
		const result = await useCase.run({
			imageId: image.id,
			reporterId: 'reporter-1',
			reason: 'spam',
		})

		expect(result.report.id).toBe('report-1')
		expect(result.report).not.toHaveProperty('details')
		expect(result.report).not.toHaveProperty('reporterId')
		expect(LogManager.info).toHaveBeenCalledWith(expect.stringContaining('reportId=report-1'))
		expect(LogManager.info).toHaveBeenCalledWith(expect.stringContaining(`imageId=${image.id}`))
		const infoCalls = jest.mocked(LogManager.info).mock.calls.map((call) => String(call[0]))
		expect(infoCalls.some((line) => line.includes('details'))).toBe(false)
	})

	it('retorna 404 para imagem inexistente', async () => {
		;(ImageRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(null),
		}))
		const useCase = new ReportImage()

		await expect(
			useCase.run({
				imageId: image.id,
				reporterId: 'reporter-1',
				reason: 'spam',
			})
		).rejects.toBeInstanceOf(NotFoundError)
	})

	it('retorna 404 para imagem privada de outro usuário', async () => {
		;(ImageRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({
				...image,
				visibility: Visibility.PRIVATE,
			}),
		}))
		const useCase = new ReportImage()

		await expect(
			useCase.run({
				imageId: image.id,
				reporterId: 'reporter-1',
				reason: 'spam',
			})
		).rejects.toBeInstanceOf(NotFoundError)
	})

	it('rejeita denúncia da própria imagem', async () => {
		const useCase = new ReportImage()

		await expect(
			useCase.run({
				imageId: image.id,
				reporterId: 'owner-1',
				reason: 'spam',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita duplicata com ConflictError', async () => {
		;(ReportRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByImageAndReporter: jest.fn().mockResolvedValue({
				id: 'existing',
				imageId: image.id,
				reporterId: 'reporter-1',
				reason: 'spam',
				details: null,
				status: 'open',
				createdAt: new Date(),
			}),
			create: jest.fn(),
		}))
		const useCase = new ReportImage()

		await expect(
			useCase.run({
				imageId: image.id,
				reporterId: 'reporter-1',
				reason: 'spam',
			})
		).rejects.toBeInstanceOf(ConflictError)
	})

	it('exige reporterId (auth na rota)', async () => {
		const useCase = new ReportImage()

		await expect(
			useCase.run({
				imageId: image.id,
				reporterId: '',
				reason: 'spam',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})
})
