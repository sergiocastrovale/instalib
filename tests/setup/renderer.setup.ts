import { beforeEach } from 'vitest'
import { createApiMock } from '../mocks/window-api'

beforeEach(() => {
  window.api = createApiMock()
})
