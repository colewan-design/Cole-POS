import type { PosRepository } from '@pos/data/index'

let repository: PosRepository | null = null

export function setPosRepository(nextRepository: PosRepository) {
  repository = nextRepository
}

export function getPosRepository(): PosRepository {
  if (!repository) {
    throw new Error('POS repository has not been configured.')
  }

  return repository
}
