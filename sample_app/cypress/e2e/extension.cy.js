describe('Chrome Extension Tests', () => {
  before(() => {
    // Visit the sample app
    cy.visit('/');
  });

  it('should load the extension and verify a button click', () => {
    // Example: Check if the extension button is injected into the page
    cy.get('#extension-button') // Replace with the actual selector for your extension's button
      .should('exist')
      .click();

    // Verify the expected behavior after the button click
    cy.get('#result') // Replace with the actual selector for the result element
      .should('contain', 'Expected Result');
  });
});

// Deterministic extension ID for the provided key in manifest.json
const EXTENSION_ID = 'jlkjghjlkjghjlkjghjlkjghjlkjghjlk'; // <-- Replace with actual deterministic ID

function getExtensionId() {
  return cy.window({ log: false }).then((win) => {
    // Find the extension's origin from the list of open frames
    const frames = win.parent.frames;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.location && frame.location.protocol === 'chrome-extension:') {
        return frame.location.host;
      }
    }
    // Fallback: try to parse from the document's referrer
    const match = win.document.referrer.match(/chrome-extension:\/\/([a-z]{32})\//);
    if (match) {
      return match[1];
    }
    throw new Error('Extension ID not found');
  });
}

describe('Chrome Extension Popup', () => {
  it('skipped: direct popup testing is not supported in Cypress with baseUrl', () => {
    // This test is skipped because Cypress cannot visit chrome-extension:// URLs with baseUrl set.
    // To test the popup, use manual or visual testing, or a different approach.
    cy.log('Direct popup testing is not supported in Cypress with baseUrl.');
    // Optionally, you can use this test to check for extension-injected UI in the sample app page.
  });
});
