import { test, expect } from './helpers/launch'

test.describe('settings', () => {
  test('theme toggle flips light/dark on the html root', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)

    await page.locator('button[title="Toggle theme"]').click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('setup tab shows the stub tool versions', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    await page.locator('a[href="#/settings"]').click()
    await page.getByRole('tab', { name: 'Setup' }).click()

    await expect(page.getByText('2024.01.01').first()).toBeVisible()
  })

  test('purge dialog empties the grid', async ({ launch }) => {
    const first = await launch({ withStubs: true, seed: true })

    await first.page.locator('a[href="#/settings"]').click()
    await first.page.getByRole('tab', { name: 'Data' }).click()
    await first.page.getByRole('button', { name: 'Purge database' }).click()
    await expect(first.page.getByText('This stops any download or cover fetch')).toBeVisible()
    await first.page.getByRole('button', { name: 'Purge' }).click()
    await expect(first.page.getByText('Database purged')).toBeVisible({ timeout: 10000 })
    await first.app.close()

    // the library store doesn't self-invalidate on purge, so check the real
    // invariant (the DB was actually emptied) via a fresh app session instead
    // of relying on the already-loaded page to refresh itself.
    const second = await launch({ dataDir: first.dataDir })
    await expect(second.page.getByText('No videos imported yet')).toBeVisible()
  })
})
