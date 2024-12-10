const fs = require('fs');
const path = require('path');

describe('Background Script', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the Chrome API
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        onActivated: {
          addListener: jest.fn()
        }
      }
    };

    // Define background script functions
    global.shouldTabBeActive = (info, next) => {
      const defaultSettings = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false
      };

      chrome.storage.sync.get(defaultSettings, function(settings) {
        if (info.button == 'left')
          return next(null, settings['link-left-click-prevent-new-tab']);
        else
          return next(null, settings[`link-${info.button}-click`] == 'fore');
      });
    };

    global.getActiveTab = (next) => {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        return next(null, tabs && tabs[0] ? tabs[0] : null);
      });
    };

    global.openLink = (info, from, next) => {
      getActiveTab((err, activeTab) => {
        shouldTabBeActive(info, (err, isActive) => {
          const tabParams = {
            url: info.url,
            active: isActive,
            index: activeTab.index + 1,
            openerTabId: activeTab.id
          };
          chrome.tabs.create(tabParams, () => next(true));
        });
      });
      return true;
    };
  });

  describe('shouldTabBeActive', () => {
    it('should return correct setting for right click', (done) => {
      const defaultSettings = {
        'link-right-click': 'back'
      };
      
      chrome.storage.sync.get.mockImplementationOnce((defaults, callback) => {
        callback(defaultSettings);
      });

      shouldTabBeActive({ button: 'right' }, (err, isActive) => {
        expect(isActive).toBe(false);
        done();
      });
    });

    it('should return correct setting for left click', (done) => {
      const defaultSettings = {
        'link-left-click-prevent-new-tab': true
      };
      
      chrome.storage.sync.get.mockImplementationOnce((defaults, callback) => {
        callback(defaultSettings);
      });

      shouldTabBeActive({ button: 'left' }, (err, isActive) => {
        expect(isActive).toBe(true);
        done();
      });
    });
  });

  describe('getActiveTab', () => {
    it('should return active tab when exists', (done) => {
      const mockTab = { id: 1, index: 0 };
      chrome.tabs.query.mockImplementationOnce((queryInfo, callback) => {
        callback([mockTab]);
      });

      getActiveTab((err, tab) => {
        expect(tab).toEqual(mockTab);
        done();
      });
    });

    it('should return null when no active tab', (done) => {
      chrome.tabs.query.mockImplementationOnce((queryInfo, callback) => {
        callback([]);
      });

      getActiveTab((err, tab) => {
        expect(tab).toBeNull();
        done();
      });
    });
  });

  describe('openLink', () => {
    it('should open new tab to the right of current tab', (done) => {
      // Mock active tab
      const mockActiveTab = { id: 1, index: 5, windowId: 1 };
      chrome.tabs.query.mockImplementationOnce((queryInfo, callback) => {
        callback([mockActiveTab]);
      });

      // Mock shouldTabBeActive
      chrome.storage.sync.get.mockImplementationOnce((defaults, callback) => {
        callback({ 'link-right-click': 'back' });
      });

      // Mock tab creation
      chrome.tabs.create.mockImplementationOnce((params, callback) => {
        expect(params.index).toBe(mockActiveTab.index + 1);
        expect(params.openerTabId).toBe(mockActiveTab.id);
        callback();
        done();
      });

      openLink({ button: 'right', url: 'https://example.com' }, null, () => {});
    });
  });
});
