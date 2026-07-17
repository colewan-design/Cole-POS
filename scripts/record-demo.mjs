// One-off Playwright script that drives the app and records a demo video.
// Usage: node scripts/record-demo.mjs   (dev server must already be running)
import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:5173'
const OUT_DIR = path.resolve('recordings')
fs.mkdirSync(OUT_DIR, { recursive: true })

let t0 = 0
const log = (msg) => {
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
  console.log(`[demo] ${elapsed}s ${msg}`)
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  })
  const page = await context.newPage()
  t0 = Date.now()
  const pause = (ms) => page.waitForTimeout(ms)

  // ── Landing page ──────────────────────────────────────────────────────
  log('Landing page')
  await page.goto(`${BASE}/landing`, { waitUntil: 'load' })
  await pause(1800)
  await page.mouse.wheel(0, 700)
  await pause(1000)
  await page.mouse.wheel(0, 900)
  await pause(1000)
  await page.mouse.wheel(0, 900)
  await pause(1400)
  await page.mouse.wheel(0, -2600)
  await pause(800)

  // ── Enter the app as a guest ─────────────────────────────────────────
  log('Entering the app')
  await page.getByRole('link', { name: 'Explore the app' }).first().click()
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await page.waitForURL(/\/app\//)
  await pause(2400)

  async function openSettings() {
    await page.getByRole('button', { name: 'Guest Demo' }).click()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await pause(600)
  }

  async function setBusinessMode(label) {
    await page.getByRole('button', { name: 'Business mode' }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await pause(1800)
  }

  async function goToRegister() {
    await page.getByRole('link', { name: 'Register' }).click()
    await pause(1000)
  }

  async function backToDashboard() {
    await page.getByRole('button', { name: 'Back to dashboard' }).click()
    await pause(800)
  }

  async function clearCartIfNeeded() {
    if (await page.locator('.order-line').count() > 0) {
      await page.getByRole('button', { name: 'Clear order' }).click()
      await pause(500)
    }
  }

  // ── Settings: switch to Restaurant mode ──────────────────────────────
  log('Settings — switch to Restaurant')
  await openSettings()
  await setBusinessMode('Restaurant')

  // ── Register: open the shift ─────────────────────────────────────────
  log('Register — opening shift')
  await goToRegister()
  await page.locator('.register-topbar__status').click()
  await pause(500)
  await page.getByPlaceholder('0.00').fill('5000')
  await pause(300)
  await page.locator('.shift-panel-sheet').getByRole('button', { name: 'Open shift' }).click()
  await pause(800)

  // ── Register: build and pay out a restaurant order ───────────────────
  log('Register — adding items to the order')
  const cards = page.locator('.product-card:not([disabled])')
  await cards.first().waitFor()
  await cards.nth(0).click()
  await pause(400)
  await cards.nth(1).click()
  await pause(400)
  await cards.nth(2).click()
  await pause(500)
  await cards.nth(0).click() // bump qty on the first item
  await pause(1900)

  log('Register — checkout and payment')
  await page.getByRole('button', { name: /Place Order/ }).click()
  await pause(1000)
  await page.getByRole('button', { name: 'Exact' }).click()
  await pause(700)
  await page.getByRole('button', { name: /Confirm payment/ }).click()
  await pause(2000)

  log('Order complete')
  await backToDashboard()

  // ── Tour the other business modes ────────────────────────────────────
  const otherModes = ['Grocery store', 'Nail Salon', 'Coffee shop']
  for (const label of otherModes) {
    log(`Switching business mode: ${label}`)
    await openSettings()
    await setBusinessMode(label)
    await goToRegister()
    await clearCartIfNeeded()
    const modeCards = page.locator('.product-card:not([disabled])')
    await modeCards.first().waitFor()
    await modeCards.nth(0).click()
    await pause(500)
    await modeCards.nth(1).click()
    await pause(1200)
    await backToDashboard()
  }

  // ── Reports / analytics ───────────────────────────────────────────────
  log('Reports — analytics charts')
  await page.getByRole('link', { name: 'Reports' }).click()
  await pause(1500)
  await page.mouse.wheel(0, 500)
  await pause(1200)
  await page.mouse.wheel(0, 700)
  await pause(1500)

  await context.close()
  await browser.close()

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'))
  log(`Saved: ${files.map((f) => path.join(OUT_DIR, f)).join(', ')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
