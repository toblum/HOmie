import { expect, test } from '@playwright/test'

test('renders the monthly overview and opens the detail flow', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/[A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+ 20\d{2}/)
  await expect(page.getByRole('grid', { name: 'Monatsübersicht' })).toBeVisible()

  const firstDayCell = page.getByRole('gridcell', { name: '4 Montag' })
  const firstDayButton = firstDayCell.getByRole('button')
  await expect(firstDayButton).toBeVisible()

  await firstDayButton.click()
  await expect(firstDayCell).toContainText('Mobiles Arbeiten')

  await firstDayButton.click({ button: 'right' })
  await expect(page.getByRole('dialog', { name: 'Tag bearbeiten' })).toBeVisible()
})

test('navigates months and the Jahresübersicht', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: /Mai 2026|[A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+ 20\d{2}/ })).toBeVisible()

  await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'April 2026' })).toBeVisible()

  await page.getByRole('button', { name: 'Jahresübersicht öffnen' }).click()
  await expect(page.getByRole('region', { name: 'Jahresübersicht' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: '2026' })).toBeVisible()

  await page.getByRole('button', { name: 'Vorheriges Jahr' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '2025' })).toBeVisible()

  await page.getByRole('button', { name: 'Februar 2025 öffnen' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Februar 2025' })).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Monatsübersicht' })).toBeVisible()
})
