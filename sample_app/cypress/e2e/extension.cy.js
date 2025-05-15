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

describe('Chrome Extension Popup', () => {
  it('should open the popup and verify the settings button', () => {
    // Visit the extension's popup page directly, without baseUrl
    cy.visit(`chrome-extension://${EXTENSION_ID}/popup.html`, { failOnStatusCode: false });
    cy.get('#extension-button').should('exist').click();
    // Add more assertions as needed
  });
});
