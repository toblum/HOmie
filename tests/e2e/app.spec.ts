import { expect, test } from '@playwright/test'

const MONTH_HEADING_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
})

function formatMonthHeading(date: Date): string {
  const normalizedDate = new Date(date)
  normalizedDate.setHours(12, 0, 0, 0)

  const formattedHeading = MONTH_HEADING_FORMATTER.format(normalizedDate)
  return formattedHeading.charAt(0).toUpperCase() + formattedHeading.slice(1)
}

test('renders the monthly overview and opens the detail flow', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2024-11-03T12:00:00'))
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
  await page.clock.setFixedTime(new Date('2024-11-03T12:00:00'))
  
  const today = new Date('2024-11-03T12:00:00')
  today.setHours(12, 0, 0, 0)

  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12)
  const selectedYear = previousMonth.getFullYear()
  const previousYear = selectedYear - 1
  const previousYearFebruary = new Date(previousYear, 1, 1, 12)

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: formatMonthHeading(today) })).toBeVisible()

  await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: formatMonthHeading(previousMonth) }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Jahresübersicht öffnen' }).click()
  await expect(page.getByRole('region', { name: 'Jahresübersicht' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: String(selectedYear) })).toBeVisible()

  await page.getByRole('button', { name: 'Vorheriges Jahr' }).click()
  await expect(page.getByRole('heading', { level: 1, name: String(previousYear) })).toBeVisible()

  await page.getByRole('button', { name: `${formatMonthHeading(previousYearFebruary)} öffnen` }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: formatMonthHeading(previousYearFebruary) }),
  ).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Monatsübersicht' })).toBeVisible()
})
