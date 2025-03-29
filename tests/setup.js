// Mock Element class
class MockElement {
  constructor() {
    this.value = '';
    this.style = { display: 'none' };
    this.textContent = '';
    this.disabled = false;
    this.dispatchEvent = jest.fn();
  }
}

// Mock Event class
class Event {
  constructor(type) {
    this.type = type;
  }
}

// Mock window object with location and document
const mockWindow = {
  location: {
    _href: 'https://github.com/user/repo/compare/main...feature',
    _pathname: '/user/repo/compare/main...feature',
    get href() { return this._href; },
    set href(val) { this._href = val; },
    get pathname() { return this._pathname; },
    set pathname(val) { this._pathname = val; }
  }
};

// Create document object
const mockDocument = {
  title: 'Comparing main...feature · user/repo',
  querySelector: jest.fn((selector) => {
    if (selector.includes('base') || selector.includes('Base')) {
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
  }),
  querySelectorAll: jest.fn(),
  getElementById: jest.fn((id) => {
    const element = new MockElement();
    if (id === 'generateButton') {
      element.textContent = 'Generate Summary';
    }
    return element;
  }),
  createElement: jest.fn((tag) => new MockElement()),
  body: {
    appendChild: jest.fn(),
    innerHTML: ''
  }
};

// Set up window and document globals
global.window = mockWindow;
global.document = mockDocument;
mockWindow.document = mockDocument;

// Export MockElement for use in tests
global.MockElement = MockElement;
global.Event = Event;

// Mock chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn(),
    onInstalled: {
      addListener: jest.fn()
    },
    getManifest: jest.fn().mockReturnValue({ version: '1.0.0' })
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock window methods that JSDOM doesn't implement
Object.defineProperty(window, 'close', {
  value: jest.fn(),
  writable: true
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  window.location._href = 'https://github.com/user/repo/compare/main...feature';
  window.location._pathname = '/user/repo/compare/main...feature';
  document.title = 'Comparing main...feature · user/repo';
  document.body.innerHTML = '';
}); 