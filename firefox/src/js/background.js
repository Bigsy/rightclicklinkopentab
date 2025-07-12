'use strict';

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.button === 'right') {
        // Get current tab and settings
        Promise.all([
            browser.storage.sync.get({'link-right-click': 'back'}),
            browser.tabs.query({ active: true, currentWindow: true })
        ]).then(([settings, tabs]) => {
            const shouldBeActive = settings['link-right-click'] === 'fore';
            const currentTab = tabs[0];
            
            return browser.tabs.create({
                url: request.url,
                active: shouldBeActive,
                index: currentTab.index + 1,
                openerTabId: currentTab.id
            });
        }).then((tab) => {
            sendResponse(true);
        }).catch((error) => {
            sendResponse(false);
        });
        
        return true;
    }
    
    if (request && request.button === 'left') {
        browser.storage.sync.get({'link-left-click-prevent-new-tab': false}).then((settings) => {
            const result = settings['link-left-click-prevent-new-tab'];
            sendResponse(result);
        }).catch((error) => {
            sendResponse(false);
        });
        
        return true;
    }
    
    sendResponse(false);
    return false;
});