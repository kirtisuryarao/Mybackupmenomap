import { test, expect } from '@playwright/test'

test('signup -> login -> cycle prediction -> AI question flow', async ({ page }) => {
  test.skip(!process.env.E2E_ENABLED, 'Set E2E_ENABLED=true to run this scenario against a running app')

  const email = `e2e-${Date.now()}@example.com`
  const password = 'StrongPass123!'

  await page.goto('/auth/signup')
  await page.getByLabel(/name/i).fill('E2E User')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByLabel(/confirm password/i).fill(password)
  await page.getByRole('button', { name: /next: health profile/i }).click()
  await page.getByLabel(/age/i).fill('46')
  await page.getByLabel(/last period date/i).fill('2026-04-01')
  await page.getByLabel(/cycle length/i).fill('28')
  await page.getByLabel(/period length/i).fill('5')
  await page.getByRole('button', { name: /create account/i }).click()

  await expect(page).toHaveURL(/dashboard|home|chatbot/)

  await page.goto('/chatbot')
  await page.getByPlaceholder(/ask a cycle, fertility, or symptom question/i).fill('When is my next period?')
  await page.getByRole('button').filter({ hasText: '' }).last().click()

  await expect(page.getByText(/confidence:/i)).toBeVisible()
  await expect(page.getByText(/not medical advice/i)).toBeVisible()
})
