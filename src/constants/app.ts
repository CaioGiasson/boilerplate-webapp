import packageJson from '../../package.json'

/** Versão do app (`package.json`): embutida no bundle e comparada com `GET /api/v1/version` para forçar atualização. */
export const APP_VERSION: string = packageJson.version

/** Display name used in UI, emails, and document titles. Customize per deployment. */
export const APP_NAME = 'App'

/** Internal placeholder origin for relative URL parsing (never a real host). */
export const APP_INVALID_ORIGIN = 'https://app.invalid'
