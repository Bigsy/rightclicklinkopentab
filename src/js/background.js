'use strict';

function shouldTabBeActive(info, next) {
    var defaultSettings = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false
    };

    chrome.storage.sync.get(defaultSettings, function(settings) {
        if (info.button == 'left')
            return next(null, settings['link-left-click-prevent-new-tab']);
        else
            return next(null, settings['link-' + info.button + '-click'] == 'fore');
    });
};

function getActiveTab(next) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        return next(null, tabs && tabs[0] ? tabs[0] : null);
    });
};

function openLink(info, from, next) {
    shouldTabBeActive(info, function(err, isActive) {
        if (info.button == 'left') {
            if (isActive)
                chrome.tabs.update({ url: info.url });
            return next(isActive);
        }

        getActiveTab(function(err, activeTab) {
            var defaults = {
                increment: 0,
                activeTabId: null,
                activeWindowId: null
            };

            chrome.storage.sync.get(defaults, function(lastInfo) {
                var lastIncrement = (lastInfo.activeTabId == activeTab.id && lastInfo.activeWindowId == activeTab.windowId) ?
                    lastInfo.increment :
                    0;

                ++lastIncrement;

                var tabParams = {
                    url: info.url,
                    active: isActive,
                    index: activeTab.index + lastIncrement,
                    openerTabId: activeTab.id
                };

                if (activeTab.cookieStoreId)
                    tabParams.cookieStoreId = activeTab.cookieStoreId;

                chrome.tabs.create(tabParams, function() {
                    chrome.storage.sync.set({
                        increment: lastIncrement,
                        activeTabId: activeTab.id,
                        activeWindowId: activeTab.windowId
                    });

                    return next(true);
                });
            });
        });
    });

    return true;
};
function setActiveTabAndWindow(activeTab) {
    chrome.storage.sync.set({
        increment: 0,
        activeTabId: activeTab.tabId,
        activeWindowId: activeTab.windowId
    });
};

chrome.runtime.onMessage.addListener(openLink);
chrome.tabs.onActivated.addListener(setActiveTabAndWindow)

