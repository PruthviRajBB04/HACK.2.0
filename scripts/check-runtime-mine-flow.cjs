const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const email = 'mine.runtime.' + Date.now() + '@example.com';

    await page.goto('http://localhost:3000/create-account');
    await page.fill('input[name="fullName"]', 'Mine Runtime Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');
    await page.fill('input[name="organization"]', 'Runtime Org');
    await page.fill('input[name="department"]', 'Mine Ops');
    await page.selectOption('select[name="role"]', 'Mine Manager');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    const bodyAfterSignup = await page.locator('body').innerText();
    console.log('AFTER_SIGNUP_SNIPPET=' + bodyAfterSignup.slice(0, 800));

    if (!page.url().includes('/app/organization')) {
      console.log('SIGNUP_DID_NOT_REACH_ORG_SETUP');
      await browser.close();
      process.exit(0);
    }

    await page.fill('input[name="name"]', 'Runtime Org');
    await page.selectOption('select[name="organizationType"]', 'Public Sector Undertaking');
    await page.fill('input[name="registrationNumber"]', 'ORG-' + Date.now());
    await page.selectOption('select[name="country"]', 'India');
    await page.selectOption('select[name="state"]', 'Jharkhand');
    await page.fill('input[name="district"]', 'Dhanbad');
    await page.fill('input[name="address"]', 'Runtime Address 1');
    await page.fill('input[name="contactPersonName"]', 'Mine Runtime Tester');
    await page.fill('input[name="contactEmail"]', email);
    await page.fill('input[name="contactPhone"]', '9876543210');
    await page.fill('input[name="plannedMineCount"]', '2');
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Organization created and linked to your account', { timeout: 30000 });
    console.log('ORG_SAVED_OK');

    await page.goto('http://localhost:3000/app/mines');
    await page.waitForTimeout(1500);
    await page.fill('input[name="name"]', 'Runtime Mine');
    await page.fill('input[name="location"]', 'Dhanbad');
    await page.fill('input[name="state"]', 'Jharkhand');
    await page.fill('input[name="district"]', 'Dhanbad');
    await page.fill('input[name="operatorName"]', 'Runtime Operator');
    await page.selectOption('select[name="mineType"]', 'Underground');
    await page.selectOption('select[name="status"]', 'active');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    const body = await page.locator('body').innerText();
    console.log('ADD_MINE_RESULT=' + (body.includes('Mine saved successfully') ? 'SUCCESS' : 'FAIL'));
    console.log(body.slice(0, 2000));
  } finally {
    await browser.close();
  }
})();
