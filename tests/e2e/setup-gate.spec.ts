import { test, expect } from './helpers/launch'

test.describe('setup gate', () => {
  test('lands on /setup when yt-dlp/ffmpeg binaries are missing', async ({ launch }) => {
    const { page } = await launch({ withStubs: false })
    await expect(page).toHaveURL(/#\/setup$/)
    await expect(page.getByText('Setting up Instalib')).toBeVisible()
  })

  test('renders the library when stub binaries are present', async ({ launch }) => {
    const { page } = await launch({ withStubs: true })
    await expect(page).not.toHaveURL(/#\/setup/)
    await expect(page.getByText('No videos imported yet')).toBeVisible()
  })
})
