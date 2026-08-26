export const locales = ['pt', 'en', 'es'] as const

export type AppLocale = (typeof locales)[number]

export const DEFAULT_LOCALE: AppLocale = 'pt'

export type PasswordChecklistMessages = {
	minLength: string
	complexity: string
	lowercase: string
	uppercase: string
	number: string
	symbol: string
}

export type AppMessages = {
	app: {
		name: string
		helloWorld: string
		close: string
	}
	nav: {
		home: string
		settings: string
		openMenu: string
		closeMenu: string
		menu: string
		account: string
		signIn: string
		signUp: string
		profile: string
		signOut: string
		mainNavigation: string
	}
	validation: {
		required: string
		emailInvalid: string
		emailRequired: string
		passwordRequired: string
		nicknameRequired: string
		nicknameInvalid: string
		identifierRequired: string
		urlInvalid: string
		passwordConfirmationRequired: string
		currentPasswordRequired: string
		newPasswordRequired: string
		birthDateRequired: string
	}
	auth: {
		loginTitle: string
		registerTitle: string
		email: string
		identifier: string
		password: string
		passwordConfirmation: string
		nickname: string
		birthDate: string
		birthDateHint: string
		mustBeAdult: string
		invalidBirthDate: string
		submitLogin: string
		submitRegister: string
		successLogin: string
		successRegister: string
		errorGeneric: string
		invalidCredentials: string
		nicknameTaken: string
		nicknameAvailable: string
		nicknameUniquenessHint: string
		emailTaken: string
		passwordMismatch: string
		passwordMinLength: string
		passwordComplexity: string
		showPassword: string
		hidePassword: string
		passwordChecklist: PasswordChecklistMessages
		noAccount: string
		registerNow: string
		acceptTerms: string
		acceptPrivacy: string
		consentRequired: string
		forgotPasswordLink: string
		forgotPasswordTitle: string
		forgotPasswordHint: string
		forgotPasswordSubmit: string
		forgotPasswordSuccess: string
		resetPasswordTitle: string
		resetPasswordSubmit: string
		resetPasswordSuccess: string
		resetPasswordError: string
		resetCode: string
		newPassword: string
		newPasswordConfirmation: string
		backToLogin: string
		continueWithGoogle: string
		googleLoginRequired: string
		googleRegisterTitle: string
		googleRegisterHint: string
		googleRegisterSubmit: string
		googleRegisterSuccess: string
		googleLinkTitle: string
		googleLinkMessage: string
		googleLinkSubmit: string
		googleLinkSuccess: string
		emailChangeCancelledMessage: string
		googleEmailUnverifiedMessage: string
	}
	legal: {
		privacyTitle: string
		termsTitle: string
		privacyMetaDescription: string
		termsMetaDescription: string
		versionLabel: string
		privacyLink: string
		termsLink: string
		privacyLinkShort: string
		termsLinkShort: string
		linksLabel: string
		cookieNotice: string
		cookieDismiss: string
	}
	profile: {
		title: string
		name: string
		nickname: string
		nicknameUniquenessHint: string
		photo: string
		photoHelper: string
		addPhoto: string
		removePhoto: string
		changePhoto: string
		saveProfile: string
		changePassword: string
		currentPassword: string
		currentPasswordGoogleHint: string
		newPassword: string
		newPasswordConfirmation: string
		successProfile: string
		successPassword: string
		successPhoto: string
		downloadMyData: string
		successExport: string
		deleteAccount: string
		deleteAccountDescription: string
		deleteAccountConfirm: string
		deleteAccountPassword: string
		deleteAccountSubmit: string
		successDeleteAccount: string
		errorDeleteAccount: string
		accountDeletion: {
			title: string
			requestedAt: string
			deadlineAt: string
			bodyQuarantine: string
			bodyRestore: string
			bodyIrreversible: string
			keepButton: string
			cancelButton: string
			infoOnlyHint: string
			successCancel: string
			successKeep: string
			errorAction: string
			loading: string
		}
		errorGeneric: string
		passwordMismatch: string
		passwordMinLength: string
		passwordComplexity: string
		showPassword: string
		hidePassword: string
		passwordChecklist: PasswordChecklistMessages
		accountUnverified: string
		accountVerified: string
		email: string
		emailDisplay: string
		resendVerification: string
		verificationToken: string
		confirmVerification: string
		pendingEmailChange: string
		changeEmail: string
		currentEmail: string
		newEmail: string
		emailChangeInboxHint: string
		emailChangeRequiresVerified: string
		emailChangeUnlinksGoogleWarning: string
		emailChangeWillUnlinkGoogle: string
		successVerificationSent: string
		errorVerificationSent: string
		successEmailChangeRequested: string
		verifyEmailTitle: string
		verifyEmailSuccess: string
		verifyEmailError: string
		confirmEmailChangeTitle: string
		confirmEmailChangeSuccess: string
		confirmEmailChangePendingNew: string
		confirmEmailChangeError: string
		goToProfile: string
		activeSessions: string
		sessionCurrent: string
		sessionRevoke: string
		sessionRevokeOthers: string
		sessionEmpty: string
		sessionDevice: string
		sessionCreated: string
		sessionExpires: string
		statistics: string
		statisticsFileCount: string
		statisticsStorageUsed: string
		statisticsStorageUsedValue: string
		statisticsLoading: string
	}
	settings: {
		title: string
		general: {
			title: string
			description: string
			darkMode: string
			language: string
		}
		languages: {
			pt: string
			en: string
			es: string
		}
	}
	notFound: {
		title: string
		description: string
		backHome: string
	}
	error: {
		title: string
		description: string
		retry: string
		backHome: string
	}
	apiError: {
		timeout: string
		unauthorized: string
		server: string
		network: string
		generic: string
	}
	home: {
		title: string
		description: string
		loading: string
		signedInAs: string
		guestPrompt: string
	}
	documentTitle: {
		profile: string
		settings: string
		dsComponents: string
		privacy: string
		terms: string
	}
	dsCatalog: {
		title: string
		description: string
		searchPlaceholder: string
		importLabel: string
		categoryLabel: string
		exampleLabel: string
		noResults: string
		categories: {
			actions: string
			inputs: string
			navigation: string
			feedback: string
			layout: string
			icons: string
		}
	}
}
