'use strict';
console.log('Content script loaded.');

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

    function checkBlacklist(callback) {
        const defaultSettings = { 'blacklisted-domains': '' };
        chrome.storage.sync.get(defaultSettings, function(settings) {
            const blacklist = settings['blacklisted-domains'].split('\n')
                .map(domain => domain.trim())
                .filter(domain => domain);
            
            const currentDomain = window.location.hostname;
            console.log('Checking domain:', currentDomain, 'against blacklist:', blacklist); // Debug log
            
            isBlacklisted = blacklist.some(pattern => {
                if (pattern.startsWith('*')) {
                    // Remove the * and handle both with and without leading dot
                    const suffix = pattern.slice(1);
                    const match = currentDomain === suffix.replace(/^\./, '') || 
                                currentDomain.endsWith(suffix) ||
                                currentDomain.endsWith(suffix.replace(/^\./, ''));
                    console.log('Wildcard pattern:', pattern, 'suffix:', suffix, 'match:', match); // Debug log
                    return match;
                }
                const match = pattern === currentDomain;
                console.log('Exact pattern:', pattern, 'match:', match); // Debug log
                return match;
            });
            
            console.log('Domain is blacklisted:', isBlacklisted); // Debug log
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

        ev.preventDefault();

        chrome.runtime.sendMessage({
            url: ev.currentTarget.href,
            button: clickedButton
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