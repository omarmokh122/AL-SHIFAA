import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Set localStorage user so we don't get redirected to /login
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'super', branch: 'All' }));
  });
  
  await page.goto('http://localhost:5173/assets', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
