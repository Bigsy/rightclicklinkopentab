'use strict';

/**
 * Content script injected into all pages
 * Sets up a DOM Mutation Observer which looks for 
 * 'a' tags and adds a click handler to them
 */
(function() {
    var mouseDownPos;
    var mouseDownTimer;
    var forceLeftClickSameTab;
    var isBlacklisted = false;
    var recentRequests = new Map(); // Track recent URL requests to prevent duplicates

    function checkBlacklist(callback) {
        const defaultSettings = { 'blacklisted-domains': '' };
        chrome.storage.sync.get(defaultSettings, function(settings) {
            const blacklist = settings['blacklisted-domains'].split('\n')
                .map(domain => domain.trim())
                .filter(domain => domain);
            
            const currentDomain = window.location.hostname;
            
            isBlacklisted = blacklist.some(pattern => {
                if (pattern.startsWith('*')) {
                    // Remove the * and handle both with and without leading dot
                    const suffix = pattern.slice(1);
                    const match = currentDomain === suffix.replace(/^\./, '') || 
                                currentDomain.endsWith(suffix) ||
                                currentDomain.endsWith(suffix.replace(/^\./, ''));
                    return match;
                }
                const match = pattern === currentDomain;
                return match;
            });
            if (callback) callback(isBlacklisted);
        });
    }

    function setupMutationHelpers(onMouseDown, onMouseUp, onContextMenu) {
        function mutationChecker(nodeList) {
            function safeAddEventListener(event, listener, node) {
                node.removeEventListener(event, listener);
                node.addEventListener(event, listener);
            };

            document.querySelectorAll('a').forEach(node => {
                safeAddEventListener('mouseup', onMouseUp, node);
                safeAddEventListener('mousedown', onMouseDown, node);
                safeAddEventListener('contextmenu', onContextMenu, node);
            });
        }

        let observer = new MutationObserver(function(records) {
            //records.forEach(function(record) {
            mutationChecker();
            //});
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    };

    function wasDragged(ev) {
        return Math.ceil(ev.screenX - mouseDownPos.x) >= 5 || Math.ceil(ev.screenY - mouseDownPos.y) >= 5;
    };

    function onContextMenu(ev) {
        if (!isBlacklisted && !(ev.altKey || ev.shiftKey || ev.ctrlKey)) {
            ev.preventDefault();
        }
    };

    function persistTabOnLeftClick(next) {
        if (isBlacklisted) {
            return next && next(false);
        }
        if (forceLeftClickSameTab === undefined) {
            return chrome.runtime.sendMessage({ button: 'left' }, function(persistTab) {
                // Check if there was an error (service worker might be unresponsive)
                if (chrome.runtime.lastError) {
                    console.warn('Extension service worker unresponsive:', chrome.runtime.lastError);
                    // Try to reconnect by resetting the cached value
                    forceLeftClickSameTab = undefined;
                    return next && next(false);
                }
                forceLeftClickSameTab = persistTab;
                return next && next(forceLeftClickSameTab);
            });
        }
        return next && next(forceLeftClickSameTab);
    };

    function modifyAnchorElement(node) {
        if (isBlacklisted) return;
        persistTabOnLeftClick(function(persistTab) {
            if (persistTab)
                node.removeAttribute('target');
        });
    };

    function onMouseDown(ev) {
        if (isBlacklisted) return;
        mouseDownPos = {
            x: ev.screenX,
            y: ev.screenY
        };

        if (!ev.button)
            modifyAnchorElement(ev.currentTarget);
    };

    function onMouseUp(ev) {
        if (isBlacklisted) return;
        if (ev.altKey || ev.shiftKey || ev.ctrlKey)
            return;

        if (wasDragged(ev))
            return;

        var clickedButton = [null, null, 'right'][ev.button];
        if (!clickedButton)
            return;

        if (!(ev.currentTarget && ev.currentTarget.href))
            return;

        // Prevent duplicate tab opening by checking recent requests
        const url = ev.currentTarget.href;
        const now = Date.now();
        const recentKey = `${url}_${clickedButton}`;
        
        if (recentRequests.has(recentKey)) {
            const lastRequest = recentRequests.get(recentKey);
            if (now - lastRequest < 500) { // 500ms debounce window
                return; // Skip duplicate request
            }
        }
        
        recentRequests.set(recentKey, now);
        
        // Clean up old entries (older than 1 second)
        for (const [key, timestamp] of recentRequests.entries()) {
            if (now - timestamp > 1000) {
                recentRequests.delete(key);
            }
        }

        ev.preventDefault();

        chrome.runtime.sendMessage({
            url: url,
            button: clickedButton
        }, function(response) {
            // Check if there was an error (service worker might be unresponsive)
            if (chrome.runtime.lastError) {
                console.warn('Failed to open link, service worker unresponsive:', chrome.runtime.lastError);
                // Reset cached value to force reconnection attempt
                forceLeftClickSameTab = undefined;
            }
        });
    };

    // Check blacklist first, then initialize extension
    checkBlacklist((blacklisted) => {
        if (!blacklisted) {
            persistTabOnLeftClick();
            setupMutationHelpers(onMouseDown, onMouseUp, onContextMenu);
        }
    });

    // Listen for blacklist changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes['blacklisted-domains']) {
            checkBlacklist();
        }
    });
})();