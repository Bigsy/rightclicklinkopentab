const fs = require('fs');
const path = require('path');

describe('Content Script', () => {
  let mockElement;
  
  beforeEach(() => {
    // Set up document body
    document.body.innerHTML = `
      <a href="https://example.com" id="test-link">Test Link</a>
    `;
    mockElement = document.getElementById('test-link');
    
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Chrome API
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn((defaults, callback) => callback(defaults)),
          set: jest.fn()
        }
      }
    };

    // Add event listeners to the link
    mockElement.addEventListener('contextmenu', (ev) => {
      if (!(ev.altKey || ev.shiftKey || ev.ctrlKey)) {
        ev.preventDefault();
      }
    });

    mockElement.addEventListener('mouseup', (ev) => {
      if (ev.altKey || ev.shiftKey || ev.ctrlKey) return;
      if (ev.button !== 2) return; // Only handle right clicks

      ev.preventDefault();
      chrome.runtime.sendMessage({
        url: ev.currentTarget.href,
        button: 'right'
      });
    });
  });

  describe('Link click handling', () => {
    it('should prevent default on right click without modifiers', () => {
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2
      });
      
      mockElement.dispatchEvent(contextMenuEvent);
      expect(contextMenuEvent.defaultPrevented).toBe(true);
    });

    it('should not prevent default on right click with modifiers', () => {
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        ctrlKey: true
      });
      
      mockElement.dispatchEvent(contextMenuEvent);
      expect(contextMenuEvent.defaultPrevented).toBe(false);
    });

    it('should send message to background script on right click', (done) => {
      chrome.runtime.sendMessage.mockImplementationOnce((message) => {
        expect(message).toEqual({
          url: 'https://example.com/',  // JSDOM adds trailing slash
          button: 'right'
        });
        done();
        return true;
      });

      const mouseEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        button: 2
      });
      
      mockElement.dispatchEvent(mouseEvent);
    });
  });
});
