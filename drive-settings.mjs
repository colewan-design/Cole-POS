import { chromium } from 'playwright'

const errors = []

async function run(colorScheme, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, colorScheme })
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[${label}] ${msg.text()}`) })
  page.on('pageerror', (err) => errors.push(`[${label}] ${String(err)}`))

  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Settings')
  await page.screenshot({ path: `debug-settings-${label}.png` })

  // open the business mode menu and pick "Restaurant"
  await page.click('button[aria-label="Business mode"]')
  await page.waitForSelector('[role="listbox"]')
  await page.screenshot({ path: `debug-settings-${label}-menu.png` })
  await page.click('button[role="option"]:has-text("Restaurant")')
  await page.waitForTimeout(200)
  await page.screenshot({ path: `debug-settings-${label}-selected.png` })

  // toggle "Animate total updates"
  await page.click('input[aria-label="Animate total updates"]')
  await page.waitForTimeout(200)
  await page.screenshot({ path: `debug-settings-${label}-toggle.png` })

  // switch appearance to dark explicitly
  await page.click('button[aria-label="Appearance"]')
  await page.waitForSelector('[role="listbox"]')
  await page.click('button[role="option"]:has-text("Dark")')
  await page.waitForTimeout(200)
  await page.screenshot({ path: `debug-settings-${label}-forced-dark.png` })

  // reload to confirm persistence
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=Settings')
  await page.screenshot({ path: `debug-settings-${label}-after-reload.png` })

  await browser.close()
}

await run('light', 'light-os')
console.log('CONSOLE_ERRORS', JSON.stringify(errors))
