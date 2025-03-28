// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
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