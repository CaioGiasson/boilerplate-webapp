export const Visibility = {
	PUBLIC: 'PUBLIC',
	PRIVATE: 'PRIVATE',
	SECRET: 'SECRET',
	PROTECTED: 'PROTECTED',
} as const

export type Visibility = (typeof Visibility)[keyof typeof Visibility]

export const VISIBILITY_VALUES: readonly Visibility[] = [
	Visibility.PUBLIC,
	Visibility.PRIVATE,
	Visibility.SECRET,
	Visibility.PROTECTED,
]

export function isVisibility(value: unknown): value is Visibility {
	return typeof value === 'string' && (VISIBILITY_VALUES as readonly string[]).includes(value)
}
