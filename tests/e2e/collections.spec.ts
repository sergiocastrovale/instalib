import { test, expect } from './helpers/launch'

test.describe('collections', () => {
  test('sidebar lists seeded collections and links to their pages', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })
    const sidebar = page.locator('aside')

    await expect(sidebar.getByRole('link', { name: /Trips/ })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Food/ })).toBeVisible()

    await sidebar.getByRole('link', { name: /Trips/ }).click()
    await expect(page.getByRole('heading', { name: 'Trips' })).toBeVisible()
    await expect(page.getByText('5 videos')).toBeVisible()
  })

  test('deleting a collection via the confirm dialog orphans non-favorite videos out of the app', async ({
    launch
  }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    await page.locator('aside').getByRole('link', { name: /Food/ }).click()
    await expect(page.getByText('4 videos')).toBeVisible()

    await page.locator('button:has(svg.lucide-ellipsis-vertical)').click()
    await page.getByText('Remove from app').click()
    await expect(page.getByText('Are you sure you want to remove this collection?')).toBeVisible()
    await page.getByRole('button', { name: 'Remove' }).click()

    await expect(page).toHaveURL(/#\/$/)
    await page.getByRole('link', { name: /All saved/ }).first().click()
    // 4 non-favorite Food videos removed (SEED005..008, none of which are favorites) -> 11 remain
    await expect(page.getByText('11 videos')).toBeVisible()
  })
})
