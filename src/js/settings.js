(function() {
    'use strict';

    var defaultSettings = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false
    };

    function loadCurrentSettings() {
        chrome.storage.sync.get(defaultSettings, function(settings) {
            Object.keys(settings).forEach(function(key) {
                var node = document.getElementById(key);

                if (!node)
                    return;

                if (node instanceof HTMLSelectElement) {
                    node = node.getElementsByClassName(settings[key]);
                    if (node && node[0])
                        node[0].selected = true;
                } else {
                    node.checked = settings[key];
                }
            });
        });
    };

    function setupEventHandlers() {
        Object.keys(defaultSettings).forEach(function(key) {
            var node = document.getElementById(key);

            if (!node)
                return;

            function getHandler(type) {
                return function handler(ev) {
                    var settings = {};
                    var value = type == 'select' ?
                        (ev.currentTarget.value || 'back') :
                        (ev.currentTarget.checked);

                    settings[key] = value;
                    chrome.storage.sync.set(settings);
                };
            };

            node.addEventListener('change', getHandler(node instanceof HTMLSelectElement ? 'select' : null));
        });
    };

    document.addEventListener("DOMContentLoaded", function(event) {
        loadCurrentSettings();
        setupEventHandlers();
    });
})();