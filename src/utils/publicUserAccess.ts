import { toPublicUser, type PublicUser, type UserEntity } from '@/repositories/User.repository'
import { getStorageUrlService } from '@/services/Storage/StorageUrl.service'

export async function toPublicUserWithSignedPhoto(user: UserEntity): Promise<PublicUser> {
	return getStorageUrlService().withSignedPublicUser(toPublicUser(user))
}
