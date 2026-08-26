import type { EmailTokenPurpose } from '@/utils/emailToken'

export function buildEmailVerificationMail(input: {
	appBaseUrl: string
	locale: string
	token: string
	purpose: Exclude<EmailTokenPurpose, 'password_reset'>
}): { subject: string; text: string } {
	const base = input.appBaseUrl.replace(/\/$/, '')
	const path = input.purpose === 'verify' ? `/${input.locale}/verify-email` : `/${input.locale}/confirm-email-change`
	const link = `${base}${path}?token=${encodeURIComponent(input.token)}`
	const code = input.token.toUpperCase()

	if (input.purpose === 'verify') {
		return {
			subject: 'Confirm your App account',
			text: `Your App verification code is:\n\n${code}\n\nEnter this code in your profile, or open this link (valid for 1 hour):\n${link}\n\nIf you did not create an account, ignore this message.`,
		}
	}
	if (input.purpose === 'change_old') {
		return {
			subject: 'Confirm email change (current address)',
			text: `Your App confirmation code is:\n\n${code}\n\nSomeone requested to change the email on your account. Confirm with this code or open (valid for 1 hour):\n${link}\n\nIf this was not you, ignore this message and keep your password secure.`,
		}
	}
	return {
		subject: 'Confirm your new App email',
		text: `Your App confirmation code is:\n\n${code}\n\nConfirm your new email with this code or open (valid for 1 hour):\n${link}\n\nIf you did not request this, ignore this message.`,
	}
}

export function buildAccountVerifiedMail(): { subject: string; text: string } {
	return {
		subject: 'Your App account is verified',
		text: `Your App account email was verified successfully.\n\nYou can now change your email and use account recovery features that require a confirmed address.\n\nIf you did not verify this account, contact support.`,
	}
}

/** Fixed EN copy (same as other transactional mails). No IP/UA/PII beyond account notice. */
export function buildNewLoginMail(): { subject: string; text: string } {
	return {
		subject: 'New login to your App account',
		text: `Someone just signed in to your App account.\n\nIf this was you, no action is needed.\n\nIf you did not sign in, change your password and review your account security as soon as possible.`,
	}
}

export function buildPasswordResetMail(input: { appBaseUrl: string; locale: string; token: string }): {
	subject: string
	text: string
} {
	const base = input.appBaseUrl.replace(/\/$/, '')
	const link = `${base}/${input.locale}/reset-password?token=${encodeURIComponent(input.token)}`
	const code = input.token.toUpperCase()

	return {
		subject: 'Reset your App password',
		text: `Your App password reset code is:\n\n${code}\n\nEnter this code on the reset page, or open this link (valid for 1 hour):\n${link}\n\nIf you did not request a password reset, ignore this message.`,
	}
}

function formatDateTime(date: Date, locale: string): string {
	const tag = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US'
	return new Intl.DateTimeFormat(tag, {
		dateStyle: 'short',
		timeStyle: 'short',
		timeZone: 'UTC',
	}).format(date)
}

/** Quarantine notice after the user requests account deletion (30-day restore window). */
export function buildAccountDeletionQuarantineMail(input: {
	locale: string
	requestedAt: Date
	deadlineAt: Date
	appBaseUrl: string
}): { subject: string; text: string } {
	const base = input.appBaseUrl.replace(/\/$/, '')
	const loginPath = `${base}/${input.locale}/login`
	const accountDeletePath = `${base}/${input.locale}/account-delete`
	const requested = formatDateTime(input.requestedAt, input.locale)
	const deadline = formatDateTime(input.deadlineAt, input.locale)

	if (input.locale === 'pt') {
		return {
			subject: 'Solicitação de exclusão de conta App — quarentena de 30 dias',
			text: [
				'Recebemos a solicitação de exclusão da sua conta App.',
				'',
				`Pedido feito em ${requested} (UTC) por você.`,
				'',
				'Sua conta e seus conteúdos entraram em quarentena. Eles permanecerão ocultos e poderão ser restaurados se você fizer login e cancelar a exclusão dentro de 30 dias.',
				'',
				`Data limite para cancelar a exclusão e recuperar a conta e os conteúdos: ${deadline} (UTC).`,
				'',
				'Para cancelar a exclusão, faça login novamente. Você verá a opção de CANCELAR ou MANTER a exclusão do perfil.',
				'',
				`Página com os detalhes: ${accountDeletePath}`,
				`Login: ${loginPath}`,
				'',
				'Conforme a LGPD, após esse prazo os dados serão excluídos de maneira IRRECUPERÁVEL (anonimização da conta, remoção dos arquivos e conteúdos no ambiente online).',
				'',
				'Se você não solicitou esta exclusão, faça login imediatamente e cancele o pedido, e altere sua senha.',
			].join('\n'),
		}
	}

	if (input.locale === 'es') {
		return {
			subject: 'Solicitud de eliminación de cuenta App — cuarentena de 30 días',
			text: [
				'Recibimos la solicitud de eliminación de tu cuenta App.',
				'',
				`Solicitud realizada el ${requested} (UTC) por ti.`,
				'',
				'Tu cuenta y tus contenidos entraron en cuarentena. Permanecerán ocultos y podrás restaurarlos si inicias sesión y cancelas la eliminación en un plazo de 30 días.',
				'',
				`Fecha límite para cancelar la eliminación y recuperar la cuenta y los contenidos: ${deadline} (UTC).`,
				'',
				'Para cancelar la eliminación, inicia sesión de nuevo. Verás la opción de CANCELAR o MANTENER la eliminación del perfil.',
				'',
				`Página con los detalles: ${accountDeletePath}`,
				`Inicio de sesión: ${loginPath}`,
				'',
				'Conforme la LGPD, después de ese plazo los datos se eliminarán de forma IRRECUPERABLE (anonimización de la cuenta, eliminación de archivos y contenidos en el entorno online).',
				'',
				'Si no solicitaste esta eliminación, inicia sesión de inmediato, cancela la solicitud y cambia tu contraseña.',
			].join('\n'),
		}
	}

	return {
		subject: 'App account deletion request — 30-day quarantine',
		text: [
			'We received a request to delete your App account.',
			'',
			`Request made on ${requested} (UTC) by you.`,
			'',
			'Your account and content are now in quarantine. They stay hidden and can be restored if you sign in and cancel deletion within 30 days.',
			'',
			`Deadline to cancel deletion and recover your account and content: ${deadline} (UTC).`,
			'',
			'To cancel deletion, sign in again. You will see options to CANCEL or KEEP profile deletion.',
			'',
			`Details page: ${accountDeletePath}`,
			`Sign in: ${loginPath}`,
			'',
			'Under the LGPD, after that deadline your data will be deleted IRREVERSIBLY (account anonymization and removal of files and content from the online environment).',
			'',
			'If you did not request this deletion, sign in immediately, cancel the request, and change your password.',
		].join('\n'),
	}
}

/** Confirmation that the user cancelled account deletion (restored from quarantine). */
export function buildAccountDeletionCancelledMail(input: { locale: string; cancelledAt: Date; appBaseUrl: string }): {
	subject: string
	text: string
} {
	const base = input.appBaseUrl.replace(/\/$/, '')
	const loginPath = `${base}/${input.locale}/login`
	const cancelled = formatDateTime(input.cancelledAt, input.locale)

	if (input.locale === 'pt') {
		return {
			subject: 'Exclusão de conta App cancelada',
			text: [
				'A solicitação de exclusão da sua conta App foi cancelada.',
				'',
				`Cancelamento em ${cancelled} (UTC), por solicitação direta sua (login e opção CANCELAR exclusão do perfil).`,
				'',
				'Sua conta e seus conteúdos foram restaurados e voltaram a ficar disponíveis.',
				'',
				`Entrar: ${loginPath}`,
				'',
				'Se você não cancelou esta exclusão, altere sua senha imediatamente e revise a segurança da conta.',
			].join('\n'),
		}
	}

	if (input.locale === 'es') {
		return {
			subject: 'Eliminación de cuenta App cancelada',
			text: [
				'La solicitud de eliminación de tu cuenta App fue cancelada.',
				'',
				`Cancelación el ${cancelled} (UTC), por tu solicitud directa (inicio de sesión y opción CANCELAR eliminación del perfil).`,
				'',
				'Tu cuenta y tus contenidos fueron restaurados y vuelven a estar disponibles.',
				'',
				`Entrar: ${loginPath}`,
				'',
				'Si no cancelaste esta eliminación, cambia tu contraseña de inmediato y revisa la seguridad de la cuenta.',
			].join('\n'),
		}
	}

	return {
		subject: 'App account deletion cancelled',
		text: [
			'The deletion request for your App account has been cancelled.',
			'',
			`Cancelled on ${cancelled} (UTC) at your direct request (sign-in and CANCEL profile deletion).`,
			'',
			'Your account and content have been restored and are available again.',
			'',
			`Sign in: ${loginPath}`,
			'',
			'If you did not cancel this deletion, change your password immediately and review your account security.',
		].join('\n'),
	}
}
