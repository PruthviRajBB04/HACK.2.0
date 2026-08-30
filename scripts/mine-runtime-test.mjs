import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const orgName = `Runtime Org ${Date.now()}`;

  await page.goto('http://localhost:3000/sign-in');
  await page.fill('input[name="identifier"]', 'pruthvirajbb04@gmail.com');
  await page.fill('input[name="password"]', 'Pass@1234');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/app\/organization$/, { timeout: 40000 });
  console.log('SIGNED_IN_URL=' + page.url());

  await page.fill('input[name="name"]', orgName);
  await page.selectOption('select[name="organizationType"]', 'Public Sector Undertaking');
  await page.fill('input[name="registrationNumber"]', 'ORG-' + Date.now());
  await page.selectOption('select[name="country"]', 'India');
  await page.selectOption('select[name="state"]', 'Jharkhand');
  await page.fill('input[name="district"]', 'Dhanbad');
  await page.fill('input[name="address"]', 'Runtime Address 1');
  await page.fill('input[name="contactPersonName"]', 'Pruthvi');
  await page.fill('input[name="contactEmail"]', 'pruthvirajbb04@gmail.com');
  await page.fill('input[name="contactPhone"]', '9876543210');
  await page.fill('input[name="plannedMineCount"]', '2');
  await page.click('button[type="submit"]');

  await page.waitForSelector('text=Organization created and linked to your account', { timeout: 40000 });
  console.log('ORG_SAVED_OK');

  await page.goto('http://localhost:3000/app/mines');
  await page.waitForTimeout(1500);
  await page.fill('input[name="name"]', 'Runtime Test Mine');
  await page.fill('input[name="location"]', 'Dhanbad');
  await page.fill('input[name="state"]', 'Jharkhand');
  await page.fill('input[name="district"]', 'Dhanbad');
  await page.fill('input[name="operatorName"]', 'Runtime Operator');
  await page.selectOption('select[name="mineType"]', 'Underground');
  await page.selectOption('select[name="status"]', 'active');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);
  const bodyText = await page.locator('body').innerText();
  console.log('HAS_SUCCESS=' + bodyText.includes('Mine saved successfully.'));
  console.log('BODY_SNIPPET=' + bodyText.slice(0, 2000));
} finally {
  await browser.close();
}
