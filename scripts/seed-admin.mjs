// One-off Playwright script that registers a demo admin account through the real
// registration form. It's the first account, so it's assigned the admin role.
// Usage: node scripts/seed-admin.mjs   (dev server must already be running)
import { chromium } from 'playwright'

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:5173'
const FULL_NAME = process.env.SEED_ADMIN_NAME ?? 'Admin'
const USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin@demo.com'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'P@$$w0rd'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${BASE}/app/auth`, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Register', exact: true }).click()

  await page.getByLabel('Full name', { exact: true }).fill(FULL_NAME)
  await page.getByLabel('Username', { exact: true }).fill(USERNAME)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)

  await page.getByRole('button', { name: 'Create account' }).click()

  const error = page.locator('.auth-error')
  const navigated = page.waitForURL((url) => !url.pathname.endsWith('/app/auth'), { timeout: 5000 }).then(() => 'navigated').catch(() => 'timeout')
  const errored = error.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'errored').catch(() => 'timeout')

  const outcome = await Promise.race([navigated, errored])

  if (outcome === 'errored' || await error.isVisible()) {
    console.error(`Registration failed: ${await error.textContent()}`)
    await page.screenshot({ path: 'scripts/.seed-admin-error.png' })
    await browser.close()
    process.exit(1)
  }

  if (outcome === 'timeout') {
    console.error(`Neither navigation nor an error appeared. Still on ${page.url()}`)
    await page.screenshot({ path: 'scripts/.seed-admin-error.png' })
    await browser.close()
    process.exit(1)
  }

  console.log(`Seeded admin account "${USERNAME}" — landed on ${page.url()}`)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
