import { findInput, updateInputValue, updatePRForm } from '../content/dom.js';

describe('DOM Module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('findInput returns the first matching input element', () => {
    document.body.innerHTML = `
      <input name="pr-title" />
      <input name="custom-title" />
    `;

    const input = findInput(['input[name="pr-title"]', 'input[name="custom-title"]']);
    expect(input).not.toBeNull();
    expect(input.name).toBe('pr-title');
  });

  test('findInput returns null if no matching input is found', () => {
    const input = findInput(['input[name="non-existent"]']);
    expect(input).toBeNull();
  });

  test('updateInputValue updates the value of an input and dispatches an input event', () => {
    const input = document.createElement('input');
    jest.spyOn(input, 'dispatchEvent');

    updateInputValue(input, 'Test Value');

    expect(input.value).toBe('Test Value');
    expect(input.dispatchEvent).toHaveBeenCalledWith(expect.any(Object));
  });

  test('updatePRForm updates the title and description inputs', () => {
    document.body.innerHTML = `
      <input name="pr-title" />
      <textarea name="pr-description"></textarea>
    `;

    const titleInput = document.querySelector('input[name="pr-title"]');
    const descriptionInput = document.querySelector('textarea[name="pr-description"]');

    jest.spyOn(titleInput, 'dispatchEvent');
    jest.spyOn(descriptionInput, 'dispatchEvent');

    updatePRForm({ title: 'Test Title', description: 'Test Description' });

    expect(titleInput.value).toBe('Test Title');
    expect(descriptionInput.value).toBe('Test Description');
    expect(titleInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Object));
    expect(descriptionInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Object));
  });

  test('updatePRForm logs warnings if inputs are missing', () => {
    console.warn = jest.fn();

    updatePRForm({ title: 'Test Title', description: 'Test Description' });

    expect(console.warn).toHaveBeenCalledWith('No title input found');
    expect(console.warn).toHaveBeenCalledWith('No description input found');
  });
});
