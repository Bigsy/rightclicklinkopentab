const chrome = require('jest-chrome');

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn((callback) => {
        global.chrome.runtime.onMessage.callback = callback;
      })
    }
  },
  storage: {
    sync: {
      get: jest.fn((defaults, callback) => callback(defaults)),
      set: jest.fn((data, callback) => callback && callback())
    }
  },
  tabs: {
    query: jest.fn((queryInfo, callback) => callback([])),
    create: jest.fn((params, callback) => callback && callback()),
    update: jest.fn((params, callback) => callback && callback()),
    onActivated: {
      addListener: jest.fn()
    }
  }
};

// Make chrome global
global.chrome = chrome;
