import { test, expect } from './helpers/launch'

test.describe('library', () => {
  test('seeded grid shows all saved videos and collections', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    await page.getByRole('link', { name: /All saved/ }).first().click()
    await expect(page.getByText('15 videos')).toBeVisible()
  })

  test('search filters the grid', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    await page.getByPlaceholder('Search for a video or collection').fill('wombat')
    await expect(page.getByText('wombat_watcher').first()).toBeVisible()
  })

  test('favorite toggle persists across relaunch', async ({ launch }) => {
    const first = await launch({ withStubs: true, seed: true })
    await first.page.getByRole('link', { name: /All saved/ }).first().click()

    // first seeded video (SEED000) is already a favorite - unfavorite it, then
    // relaunch pointed at the same data dir and confirm it stuck.
    const firstCard = first.page.locator('a[href*="/watch/"]').first()
    await firstCard.click()
    const favoriteButton = first.page.getByRole('button', { name: /Favorited/ })
    await expect(favoriteButton).toBeVisible()
    await favoriteButton.click()
    await expect(first.page.getByRole('button', { name: /^Favorite$/ })).toBeVisible()
    await first.app.close()

    const second = await launch({ dataDir: first.dataDir })
    await second.page.locator('aside').getByRole('link', { name: /Favorites/ }).click()
    await expect(second.page.getByText('2 videos')).toBeVisible()
  })
})
