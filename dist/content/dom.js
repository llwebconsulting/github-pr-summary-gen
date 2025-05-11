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
  const titleInput = findInput(['input[name="pr-title"]', 'input[name="custom-title"]']);
  const descriptionInput = findInput(['textarea[name="pr-description"]', 'textarea[name="custom-description"]']);

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
