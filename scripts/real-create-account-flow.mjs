import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const email = `runtime.mine.${Date.now()}+test@gmail.com`;
const password = 'TestPass123!';
const orgName = `Runtime Org ${Date.now()}`;

try {
  await page.goto('http://localhost:3000/create-account', { waitUntil: 'networkidle' });
  await page.fill('input[name="fullName"]', 'Runtime Tester');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);
  await page.fill('input[name="organization"]', orgName);
  await page.fill('input[name="department"]', 'Mine Ops');
  await page.selectOption('select[name="role"]', 'Mine Manager');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/organization$/, { timeout: 40000 });
  console.log('AFTER_SIGNUP_URL=' + page.url());

  await page.fill('input[name="name"]', orgName);
  await page.selectOption('select[name="organizationType"]', 'Public Sector Undertaking');
  await page.fill('input[name="registrationNumber"]', 'ORG-RUNTIME-' + Date.now());
  await page.selectOption('select[name="country"]', 'India');
  await page.selectOption('select[name="state"]', 'Jharkhand');
  await page.fill('input[name="district"]', 'Dhanbad');
  await page.fill('input[name="address"]', 'Runtime test address');
  await page.fill('input[name="contactPersonName"]', 'Runtime Tester');
  await page.fill('input[name="contactEmail"]', email);
  await page.fill('input[name="contactPhone"]', '9876543210');
  await page.fill('input[name="plannedMineCount"]', '2');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Organization created and linked to your account', { timeout: 40000 });
  console.log('ORG_CREATED_OK');

  await page.goto('http://localhost:3000/app/mines', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.fill('input[name="name"]', 'Runtime Insert Mine');
  await page.fill('input[name="location"]', 'Dhanbad');
  await page.fill('input[name="state"]', 'Jharkhand');
  await page.fill('input[name="district"]', 'Dhanbad');
  await page.fill('input[name="operatorName"]', 'Runtime Operator');
  await page.selectOption('select[name="mineType"]', 'Underground');
  await page.selectOption('select[name="status"]', 'active');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  const bodyText = await page.locator('body').innerText();
  console.log('HAS_SUCCESS=' + bodyText.includes('Mine saved successfully.'));
  console.log('BODY_SNIPPET=' + bodyText.slice(0, 2000));
} finally {
  await browser.close();
}
