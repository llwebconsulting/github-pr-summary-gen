const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Load the extension from the root of the workspace
          launchOptions.args.push(
            `--load-extension=/workspaces/github-pr-summary-gen`
          );
        }
        return launchOptions;
      });
      // Add a task to get the extension ID
      on('task', {
        getExtensionId() {
          const fs = require('fs');
          const path = require('path');
          const extensionsRoot = path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.config/google-chrome/Default/Extensions'
          );
          if (!fs.existsSync(extensionsRoot)) {
            throw new Error('Extensions directory not found');
          }
          const dirs = fs.readdirSync(extensionsRoot);
          if (!dirs.length) {
            throw new Error('No extensions found');
          }
          // Return the first extension directory found
          return dirs[0];
        },
      });
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:3000', // URL where the sample app will run
    chromeWebSecurity: false, // Disable security to allow extension testing
  },
});
