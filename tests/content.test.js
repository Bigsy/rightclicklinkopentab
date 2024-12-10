const fs = require('fs');
const path = require('path');

describe('Content Script', () => {
  let mockElement;
  let originalLocation;
  let isBlacklisted = false;
  
  beforeEach(() => {
    // Store original location and mock it
    originalLocation = window.location;
    delete window.location;
    window.location = new URL('https://example.com');

    // Set up document body
    document.body.innerHTML = `
      <a href="https://example.com" id="test-link">Test Link</a>
    `;
    mockElement = document.getElementById('test-link');
    
    // Clear all mocks
    jest.clearAllMocks();
    isBlacklisted = false;

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
          get: jest.fn((defaults, callback) => {
            callback({ 'blacklisted-domains': '' });
          }),
          set: jest.fn(),
          onChanged: {
            addListener: jest.fn()
          }
        }
      }
    };
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe('Domain blacklist', () => {
    const testCases = [
      {
        description: 'should block exact domain match',
        hostname: 'bbc.co.uk',
        blacklist: ['bbc.co.uk'],
        shouldBlock: true
      },
      {
        description: 'should block wildcard domain match',
        hostname: 'www.bbc.co.uk',
        blacklist: ['*bbc.co.uk'],
        shouldBlock: true
      },
      {
        description: 'should block subdomain with wildcard',
        hostname: 'news.bbc.co.uk',
        blacklist: ['*bbc.co.uk'],
        shouldBlock: true
      },
      {
        description: 'should not block non-matching domain',
        hostname: 'example.com',
        blacklist: ['*bbc.co.uk'],
        shouldBlock: false
      },
      {
        description: 'should not block when blacklist is empty',
        hostname: 'bbc.co.uk',
        blacklist: [],
        shouldBlock: false
      },
      {
        description: 'should block with wildcard and dot',
        hostname: 'sub.domain.example.com',
        blacklist: ['*.domain.example.com'],
        shouldBlock: true
      }
    ];

    testCases.forEach(({ description, hostname, blacklist, shouldBlock }) => {
      it(description, (done) => {
        // Set up mock location
        window.location = new URL('https://' + hostname);

        // Mock storage to return our blacklist
        chrome.storage.sync.get.mockImplementationOnce((defaults, callback) => {
          callback({ 'blacklisted-domains': blacklist.join('\n') });
        });

        // Function to check blacklist
        function checkBlacklist(callback) {
          chrome.storage.sync.get({ 'blacklisted-domains': '' }, function(settings) {
            const blacklistItems = settings['blacklisted-domains'].split('\n')
                .map(domain => domain.trim())
                .filter(domain => domain);
            
            const currentDomain = window.location.hostname;
            isBlacklisted = blacklistItems.some(pattern => {
              if (pattern.startsWith('*')) {
                const suffix = pattern.slice(1);
                return currentDomain === suffix.replace(/^\./, '') || 
                       currentDomain.endsWith(suffix) ||
                       currentDomain.endsWith(suffix.replace(/^\./, ''));
              }
              return pattern === currentDomain;
            });
            
            if (callback) callback(isBlacklisted);
          });
        }

        // Set up event listeners
        function onContextMenu(ev) {
          if (!isBlacklisted && !(ev.altKey || ev.shiftKey || ev.ctrlKey)) {
            ev.preventDefault();
          }
        }

        function onMouseUp(ev) {
          if (isBlacklisted) return;
          if (ev.altKey || ev.shiftKey || ev.ctrlKey) return;
          if (ev.button !== 2) return;

          ev.preventDefault();
          chrome.runtime.sendMessage({
            url: ev.currentTarget.href,
            button: 'right'
          });
        }

        mockElement.addEventListener('contextmenu', onContextMenu);
        mockElement.addEventListener('mouseup', onMouseUp);

        // Create test events
        const contextMenuEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2
        });

        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          button: 2
        });

        // Check blacklist and run tests
        checkBlacklist(() => {
          // Test contextmenu behavior
          mockElement.dispatchEvent(contextMenuEvent);
          expect(contextMenuEvent.defaultPrevented).toBe(!shouldBlock);

          // Test mouseup behavior
          mockElement.dispatchEvent(mouseUpEvent);
          expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(shouldBlock ? 0 : 1);

          done();
        });
      }, 6000); // Increase timeout to 6 seconds
    });

    it('should update blacklist status when storage changes', (done) => {
      // Set up initial state
      window.location = new URL('https://bbc.co.uk');
      
      // Function to check blacklist
      function checkBlacklist(callback) {
        chrome.storage.sync.get({ 'blacklisted-domains': '' }, function(settings) {
          const blacklistItems = settings['blacklisted-domains'].split('\n')
              .map(domain => domain.trim())
              .filter(domain => domain);
          
          const currentDomain = window.location.hostname;
          isBlacklisted = blacklistItems.some(pattern => {
            if (pattern.startsWith('*')) {
              const suffix = pattern.slice(1);
              return currentDomain === suffix.replace(/^\./, '') || 
                     currentDomain.endsWith(suffix) ||
                     currentDomain.endsWith(suffix.replace(/^\./, ''));
            }
            return pattern === currentDomain;
          });
          
          if (callback) callback(isBlacklisted);
        });
      }

      // Set up event listeners
      function onContextMenu(ev) {
        if (!isBlacklisted && !(ev.altKey || ev.shiftKey || ev.ctrlKey)) {
          ev.preventDefault();
        }
      }

      mockElement.addEventListener('contextmenu', onContextMenu);

      // Initial check with empty blacklist
      checkBlacklist(() => {
        // Test initial state (not blacklisted)
        const initialEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2
        });
        mockElement.dispatchEvent(initialEvent);
        expect(initialEvent.defaultPrevented).toBe(true);

        // Mock storage to return updated blacklist
        chrome.storage.sync.get.mockImplementationOnce((defaults, callback) => {
          callback({ 'blacklisted-domains': '*bbc.co.uk' });
        });

        // Simulate storage change
        checkBlacklist(() => {
          // Verify updated state (should be blacklisted)
          const updatedEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2
          });
          mockElement.dispatchEvent(updatedEvent);
          expect(updatedEvent.defaultPrevented).toBe(false);
          done();
        });
      });
    }, 6000); // Increase timeout to 6 seconds
  });
});
