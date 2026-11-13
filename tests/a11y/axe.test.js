// Gate: ZERO critical/serious axe issues on every step, in both languages. Exit 1 on failure.
// Run: docker compose --profile test run --rm axe     (or locally: BASE_URL=http://localhost:3000 node axe.test.js)
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
let failures = 0;
for (const lang of ['en', 'am']) {
  const page = await browser.newPage();
  await page.goto(BASE); await page.evaluate(l => localStorage.setItem('ao:lang', l), lang);
  await page.reload();
  for (let step = 1; step <= 6; step++) {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const bad = r.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    console.log(`[${lang}] step ${step}: ${bad.length} critical/serious`);
    bad.forEach(v => console.log('  ✗', v.id, v.help, v.nodes[0]?.target));
    failures += bad.length;
    // Advance: pick first radio / type text, press Next (steps are conditional, so loop is tolerant)
    const sh = page.locator('accessible-onboarding');
    if (await sh.locator('input[type=radio]').count()) await sh.locator('input[type=radio]').first().check();
    else if (await sh.locator('#field').count()) await sh.locator('#field').fill('Test');
    if (!(await sh.locator('#next').count())) break;
    await sh.locator('#next').click();
  }
  await page.close();
}
await browser.close();
console.log(failures ? `FAIL: ${failures} issues` : 'PASS: zero critical/serious issues');
process.exit(failures ? 1 : 0);
