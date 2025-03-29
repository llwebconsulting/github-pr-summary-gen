// Helper to create and dispatch DOM events
function dispatchEvent(eventName, target = document) {
  const event = document.createEvent('Event');
  event.initEvent(eventName, true, true);
  target.dispatchEvent(event);
}

// Helper to wait for promises to resolve
async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Helper to mock location object
function mockLocation({ href, pathname }) {
  if (!href) {
    throw new Error('href is required for mockLocation');
  }
  delete global.window.location;
  global.window.location = {
    href,
    pathname,
    host: new URL(href).host,
    search: ''
  };
}

module.exports = {
  dispatchEvent,
  flushPromises,
  mockLocation
}; 