// Playwright test for Chrome extension popup UI
// Run with: npx playwright test

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Path to the extension source directory
const EXTENSION_PATH = path.join(__dirname, '../..');

// The name of your popup HTML file
const POPUP_HTML = 'popup.html';

test('Extension popup shows settings button', async ({ browserName }) => {
  // Launch Chromium with the extension loaded
  const context = await require('@playwright/test').chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Find the extension ID by inspecting the background pages
  const backgroundPage = await context.waitForEvent('backgroundpage');
  const extensionUrl = backgroundPage.url();
  const extensionId = extensionUrl.split('/')[2];

  // Open the popup page
  const popupUrl = `chrome-extension://${extensionId}/${POPUP_HTML}`;
  const page = await context.newPage();

  // Capture and print all console messages from the popup
  page.on('console', msg => {
    console.log(`[popup console.${msg.type()}]`, ...msg.args().map(arg => arg._remoteObject.value));
  });
  page.on('pageerror', error => {
    console.error('[popup pageerror]', error);
  });

  await page.goto(popupUrl);

  // Try to find the settings button, print HTML if not found
  const button = page.locator('#extension-button');
  try {
    await expect(button).toBeVisible({ timeout: 10000 });
  } catch (e) {
    const html = await page.content();
    fs.writeFileSync('test-results/popup-failed.html', html);
    console.log('Popup HTML content saved to test-results/popup-failed.html');
    throw e;
  }

  // Close context
  await context.close();
});
