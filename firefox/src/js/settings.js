(function() {
    'use strict';

    var defaultSettings = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false,
        'blacklisted-domains': ''
    };

    function loadCurrentSettings() {
        browser.storage.sync.get(defaultSettings).then(function(settings) {
            Object.keys(settings).forEach(function(key) {
                var node = document.getElementById(key);

                if (!node)
                    return;

                if (node instanceof HTMLSelectElement) {
                    node = node.getElementsByClassName(settings[key]);
                    if (node && node[0])
                        node[0].selected = true;
                } else if (key !== 'blacklisted-domains') {
                    node.checked = settings[key];
                }
            });

            // Handle blacklist textarea separately since it's not a checkbox or select
            var blacklistNode = document.getElementById('blacklisted-domains');
            if (blacklistNode) {
                blacklistNode.value = settings['blacklisted-domains'] || '';
            }
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
                    browser.storage.sync.set(settings);
                };
            };

            node.addEventListener('change', getHandler(node instanceof HTMLSelectElement ? 'select' : null));
        });

        // Add event handler for blacklist textarea
        var blacklistNode = document.getElementById('blacklisted-domains');
        if (blacklistNode) {
            blacklistNode.addEventListener('change', function(ev) {
                var settings = {};
                settings['blacklisted-domains'] = ev.target.value.trim();
                browser.storage.sync.set(settings);
            });
        }
    };

    document.addEventListener("DOMContentLoaded", function(event) {
        loadCurrentSettings();
        setupEventHandlers();
    });
})();