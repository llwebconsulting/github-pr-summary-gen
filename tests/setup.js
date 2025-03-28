// Mock window object
const mockWindow = {
  location: {
    href: 'https://github.com/user/repo/compare/main...feature',
    pathname: '/user/repo/compare/main...feature'
  },
  document: {
    title: 'Comparing main...feature · user/repo',
    querySelector: jest.fn((selector) => {
      if (selector.includes('base')) {
        const baseSelect = new MockElement();
        baseSelect.value = 'main';
        return baseSelect;
      }
      if (selector === 'input[name="pull_request[title]"]' || selector === '#pull_request_title' || selector === 'input[aria-label="Title"]') {
        return new MockElement();
      }
      if (selector === 'textarea[name="pull_request[body]"]' || selector === '#pull_request_body' || selector === 'textarea[aria-label="Description"]') {
        return new MockElement();
      }
      return null;
    })
  }
};

// Apply the mock window object
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true
});

// Also set global.document to use the window's document
global.document = global.window.document;

// Mock chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn((listener) => {
        chrome.runtime.onMessage.listener = listener;
      })
    }
  },
  storage: {
    sync: {
      get: jest.fn()
    }
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock Element class
class MockElement {
  constructor() {
    this.value = '';
    this.dispatchEvent = jest.fn();
  }
}

global.MockElement = MockElement;

// Mock Event
global.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

// Mock DOM elements
global.MockElement = class MockElement {
  constructor() {
    this.value = '';
    this.dispatchEvent = jest.fn();
  }
};

// Mock browser environment
const querySelectorMock = jest.fn();
const querySelectorAllMock = jest.fn();

// Create a custom location object that doesn't try to navigate
const locationObj = {
  _href: '',
  _pathname: '',
  get href() { return this._href; },
  set href(val) { this._href = val; },
  get pathname() { return this._pathname; },
  set pathname(val) { this._pathname = val; }
};

// Create a document object with mockable querySelector
const documentObj = {
  title: '',
  _querySelector: querySelectorMock,
  get querySelector() { return this._querySelector; },
  set querySelector(val) { this._querySelector = val; },
  _querySelectorAll: querySelectorAllMock,
  get querySelectorAll() { return this._querySelectorAll; },
  set querySelectorAll(val) { this._querySelectorAll = val; }
};

global.window = {
  location: locationObj,
  document: documentObj
};

// Setup common DOM elements
querySelectorMock.mockImplementation((selector) => {
  if (selector.includes('title') || selector.includes('Title')) {
    return new MockElement();
  }
  if (selector.includes('body') || selector.includes('Description')) {
    return new MockElement();
  }
  if (selector.includes('base') || selector.includes('Base')) {
    return new MockElement();
  }
  return null;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  window.location._href = '';
  window.location._pathname = '';
  window.document.title = '';
  window.document._querySelector = querySelectorMock;
  window.document._querySelectorAll = querySelectorAllMock;
}); 