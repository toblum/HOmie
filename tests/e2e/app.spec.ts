import { expect, test } from '@playwright/test'

test('persists Monatsübersicht changes across a full reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Monatsübersicht' })).toBeVisible()
  const configuredNote = `Playwright proof ${Date.now()}`
  const firstDay = page.getByRole('button', { name: /^Tag / }).first()
  const firstDayLabel = await firstDay.getAttribute('aria-label')

  if (firstDayLabel === null) {
    throw new Error('No working day button was rendered in the Monatsübersicht.')
  }

  const firstDayDate = firstDayLabel.replace('Tag ', '')

  await page.getByRole('button', { name: `Details für ${firstDayDate}` }).click()
  await page.getByRole('radio', { name: 'Mobiles Arbeiten' }).check()
  await page.getByLabel('Notiz').fill(configuredNote)
  await page.getByRole('button', { name: 'Speichern' }).click()

  const configuredDay = page.getByRole('button', { name: firstDayLabel })
  await expect(configuredDay.getByText('Mobiles Arbeiten')).toBeVisible()
  await expect(configuredDay.getByText(configuredNote)).toBeVisible()

  await page.reload()

  const reloadedDay = page.getByRole('button', { name: firstDayLabel })
  await expect(reloadedDay.getByText('Mobiles Arbeiten')).toBeVisible()
  await expect(reloadedDay.getByText(configuredNote)).toBeVisible()
})
