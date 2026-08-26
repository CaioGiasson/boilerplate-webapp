# DTO checklist — public API responses

Use this checklist when adding or changing routes that return user or image data. Goal: never leak ORM/internal fields in JSON responses.

## Before merging a route change

- [ ] Response goes through a **presenter/mapper** (`toPublicUser`, mosaic builder, export assembler) — not raw Prisma/entity spread.
- [ ] **User payloads** use `PublicUser` / `toPublicUser` (or `toPublicUserWithSignedPhoto` for signed URLs).
- [ ] **Never include** in public JSON: `passwordHash`, `emailTokenHash`, `emailTokenPurpose`, `emailTokenExpiresAt`, `dateOfBirth`, `ageVerifiedAt`, `deletedAt`, `sessionsRevokedAt`, `lastLoginDevice`, `acceptedTermsAt`, `acceptedPrivacyAt`, `termsVersion`, `privacyVersion`.
- [ ] **Image payloads** expose only mosaic fields (`id`, `url`, `title`, `description`, `tags`, optional `visibility`/`isOwner` for owner) — not `ownerId`, `fileId`, `deletedAt`, internal storage keys.
- [ ] **Export endpoint** (`/users/me/export`) may include audit fields for the data subject but still excludes `passwordHash` and raw token hashes.
- [ ] **Error responses** use `ApiPresenter.error` — no stack traces or internal ids in production.
- [ ] Add or update a **unit test** when introducing a new public DTO shape or mapper.

## Reference mappers

| Entity              | Mapper                                 | Allowed public fields                                                                                          |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User                | `toPublicUser` in `User.repository.ts` | `id`, `name`, `nickname`, `email`, `photoUrl`, `settings`, `emailVerifiedAt`, `pendingEmail`, `emailChallenge` |
| User (signed photo) | `toPublicUserWithSignedPhoto`          | Same as above with presigned `photoUrl`                                                                        |
| Image (mosaic)      | use case mosaic builders               | `id`, `url`, `title`, `description`, `tags`, optional `visibility`, `isOwner`                                  |

## Tests

See `tests/repositories/publicUser.dto.test.ts` for assertions that `toPublicUser` strips sensitive fields.
