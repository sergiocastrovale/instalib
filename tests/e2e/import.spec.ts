import { join } from 'node:path'
import { test, expect } from './helpers/launch'

const fixturesDir = join(__dirname, '..', 'fixtures')

test.describe('import', () => {
  test('imports an export.zip via the dropzone and populates the grid', async ({ launch }) => {
    const { page } = await launch({ withStubs: true })

    await expect(page.getByText('No videos imported yet')).toBeVisible()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(join(fixturesDir, 'export.zip'))

    await expect(page.getByText(/Imported \d+ new video/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('My Collection').first()).toBeVisible()
    await expect(page.getByText('All saved').first()).toBeVisible()
  })

  test('surfaces an error toast for a corrupt import', async ({ launch }) => {
    const { page } = await launch({ withStubs: true })

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(join(fixturesDir, 'saved_posts.invalid.json'))

    await expect(page.getByText(/Import failed|not a valid/i)).toBeVisible({ timeout: 10000 })
  })
})
