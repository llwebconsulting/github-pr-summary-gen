// Contains functions for DOM manipulation

export function findInput(selectors) {
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input) return input;
  }
  return null;
}

export function updateInputValue(input, value) {
  input.value = value || '';
  const event = document.createEvent('Event');
  event.initEvent('input', true, true);
  input.dispatchEvent(event);
}

export function updatePRForm({ title, description }) {
  const titleInput = findInput(['#pull_request_title', 'input[name="pr-title"]']); // Refined selectors
  const descriptionInput = findInput(['#pull_request_body', 'textarea[name="pr-description"]']); // Refined selectors

  if (titleInput) {
    updateInputValue(titleInput, title);
  } else {
    console.warn('No title input found');
  }

  if (descriptionInput) {
    updateInputValue(descriptionInput, description);
  } else {
    console.warn('No description input found');
  }
}
