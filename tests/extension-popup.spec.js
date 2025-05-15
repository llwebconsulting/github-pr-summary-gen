// Playwright test for Chrome extension popup UI
// Run with: npx playwright test

const { test, expect } = require('@playwright/test');
const path = require('path');

// Path to the extension source directory
const EXTENSION_PATH = path.join(__dirname, '..');

// The name of your popup HTML file
const POPUP_HTML = 'popup.html';

test('Extension popup shows settings button', async ({ browserName }) => {
  // Launch Chromium with the extension loaded
  const context = await require('@playwright/test').chromium.launchPersistentContext('', {
    headless: false,
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
  await page.goto(popupUrl);

  // Check for the settings button (update selector as needed)
  await expect(page.locator('#extension-button')).toBeVisible();

  // Close context
  await context.close();
});
