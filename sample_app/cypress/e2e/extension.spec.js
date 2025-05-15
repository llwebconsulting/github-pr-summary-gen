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
