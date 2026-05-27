import { expect, test } from '@playwright/test'

test('renders the placeholder shell', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'HOmie is ready for the first real feature slices.',
    }),
  ).toBeVisible()
  await expect(page.getByText('Static web foundation')).toBeVisible()
})
