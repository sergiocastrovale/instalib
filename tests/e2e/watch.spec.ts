import { test, expect } from './helpers/launch'

test.describe('watch', () => {
  test('playing a local video exercises the app-media:// byte-range protocol', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })

    // seeded video 0 (most recently saved) is one of the two local/downloaded
    // videos - go via /collection/all so it's deterministically first, rather
    // than the home page's "jump back in" row which may pick a non-local one.
    await page.locator('a[href*="/collection/all"]').first().click()
    await expect(page.getByText('15 videos')).toBeVisible()
    await page.locator('a[href*="/watch/"]').first().click()
    await expect(page).toHaveURL(/#\/watch\//)

    const video = page.locator('video')
    await expect(video).toBeVisible({ timeout: 10000 })
    const src = await video.evaluate((el: HTMLVideoElement) => el.src)
    expect(src).toMatch(/^app-media:\/\/video\//)

    // real byte-range fetch through the custom protocol
    await page.waitForFunction(
      () => {
        const el = document.querySelector('video') as HTMLVideoElement | null
        return !!el && el.readyState >= 1 // HAVE_METADATA
      },
      { timeout: 10000 }
    )
    const duration = await video.evaluate((el: HTMLVideoElement) => el.duration)
    expect(duration).toBeGreaterThan(0)
  })

  test('space toggles play/pause, arrow keys seek, s favorites', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })
    await page.locator('a[href*="/collection/all"]').first().click()
    await expect(page.getByText('15 videos')).toBeVisible()
    await page.locator('a[href*="/watch/"]').first().click()

    const video = page.locator('video')
    await expect(video).toBeVisible({ timeout: 10000 })
    await page.waitForFunction(() => {
      const el = document.querySelector('video') as HTMLVideoElement | null
      return !!el && el.readyState >= 1
    })

    // loadVideo autoplays, so the video may already be playing by the time we
    // get here - assert space toggles the paused state rather than assuming
    // a specific starting state.
    const pausedBefore = await video.evaluate((el: HTMLVideoElement) => el.paused)
    await page.keyboard.press(' ')
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
      .toBe(!pausedBefore)

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0)

    const favoriteButton = page.getByRole('button', { name: /Favorite/ })
    const before = (await favoriteButton.textContent()) ?? ''
    await page.keyboard.press('s')
    await expect(favoriteButton).not.toHaveText(before)
  })

  test('next/prev queue navigation moves between videos', async ({ launch }) => {
    const { page } = await launch({ withStubs: true, seed: true })
    await page.locator('a[href*="/collection/all"]').first().click()
    await expect(page.getByText('15 videos')).toBeVisible()

    await page.locator('a[href*="/watch/"]').first().click()
    await expect(page).toHaveURL(/#\/watch\//)
    const firstUrl = page.url()

    await page.keyboard.press('n')
    await expect.poll(() => page.url()).not.toBe(firstUrl)
    const secondUrl = page.url()

    await page.keyboard.press('p')
    await expect.poll(() => page.url()).toBe(firstUrl)
    expect(secondUrl).not.toBe(firstUrl)
  })
})
