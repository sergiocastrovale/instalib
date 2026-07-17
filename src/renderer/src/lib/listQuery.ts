import type { VideoListQuery } from '@shared/types'

export function listQuery(listId: string): VideoListQuery {
  return listId === 'all' ? {} : listId === 'favorites' ? { favorites: true } : { collectionId: listId }
}
