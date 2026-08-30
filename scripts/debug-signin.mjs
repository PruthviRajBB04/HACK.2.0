import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (msg) => console.log('BROWSER_CONSOLE:' + msg.type() + ':' + msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR:' + err.message));

try {
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle' });
  console.log('LOADED_URL=' + page.url());
  await page.fill('input[name="identifier"]', 'pruthvirajbb04@gmail.com');
  await page.fill('input[name="password"]', 'Pass@1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);
  console.log('FINAL_URL=' + page.url());
  console.log('BODY=' + (await page.locator('body').innerText()).slice(0, 3000));
} finally {
  await browser.close();
}
