(function() {
    'use strict';

    var defaultSettings = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false,
        'list-mode': 'blacklist',
        'domain-list': ''
    };

    function loadCurrentSettings() {
        // First get all settings including legacy ones
        chrome.storage.sync.get(null, function(allSettings) {
            // Migrate legacy blacklisted-domains to new system
            var settings = Object.assign({}, defaultSettings);
            
            // Copy over existing settings
            Object.keys(defaultSettings).forEach(function(key) {
                if (allSettings.hasOwnProperty(key)) {
                    settings[key] = allSettings[key];
                }
            });
            
            // Handle migration from old blacklisted-domains
            if (allSettings['blacklisted-domains'] && !allSettings['domain-list']) {
                settings['domain-list'] = allSettings['blacklisted-domains'];
                settings['list-mode'] = 'blacklist';
                // Save the migrated settings
                chrome.storage.sync.set({
                    'domain-list': settings['domain-list'],
                    'list-mode': settings['list-mode']
                });
                // Remove old setting
                chrome.storage.sync.remove('blacklisted-domains');
            }

            // Load settings into UI elements
            Object.keys(settings).forEach(function(key) {
                if (key === 'list-mode') {
                    // Handle radio buttons
                    var radioButton = document.getElementById('mode-' + settings[key]);
                    if (radioButton) {
                        radioButton.checked = true;
                    }
                    return;
                }
                
                if (key === 'domain-list') {
                    // Handle domain list textarea
                    var domainListNode = document.getElementById('domain-list');
                    if (domainListNode) {
                        domainListNode.value = settings['domain-list'] || '';
                    }
                    return;
                }

                var node = document.getElementById(key);
                if (!node) return;

                if (node instanceof HTMLSelectElement) {
                    var optionNode = node.getElementsByClassName(settings[key]);
                    if (optionNode && optionNode[0])
                        optionNode[0].selected = true;
                } else {
                    node.checked = settings[key];
                }
            });
            
            // Update UI labels based on current mode
            updateModeLabels(settings['list-mode']);
        });
    };

    function updateModeLabels(mode) {
        var label = document.getElementById('domain-list-label');
        var help = document.getElementById('domain-list-help');
        var textarea = document.getElementById('domain-list');
        
        if (mode === 'whitelist') {
            label.textContent = 'Whitelisted Domains:';
            help.textContent = 'Extension will ONLY work on these domains. Enter one domain per line. Use * as a wildcard (e.g. *.example.com).';
            textarea.placeholder = 'Enter domains to enable the extension on (one per line)\nExample:\nexample.com\n*.example.org';
        } else {
            label.textContent = 'Blacklisted Domains:';
            help.textContent = 'Extension will NOT work on these domains. Enter one domain per line. Use * as a wildcard (e.g. *.example.com).';
            textarea.placeholder = 'Enter domains to disable the extension on (one per line)\nExample:\nexample.com\n*.example.org';
        }
    }

    function setupEventHandlers() {
        // Handle standard settings (excluding new ones)
        ['link-right-click', 'link-left-click-prevent-new-tab'].forEach(function(key) {
            var node = document.getElementById(key);
            if (!node) return;

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

        // Handle list mode radio buttons
        var modeRadios = document.querySelectorAll('input[name="list-mode"]');
        modeRadios.forEach(function(radio) {
            radio.addEventListener('change', function(ev) {
                if (ev.target.checked) {
                    var settings = {};
                    settings['list-mode'] = ev.target.value;
                    chrome.storage.sync.set(settings);
                    updateModeLabels(ev.target.value);
                }
            });
        });

        // Handle domain list textarea
        var domainListNode = document.getElementById('domain-list');
        if (domainListNode) {
            domainListNode.addEventListener('change', function(ev) {
                var settings = {};
                settings['domain-list'] = ev.target.value.trim();
                chrome.storage.sync.set(settings);
            });
        }
    };

    document.addEventListener("DOMContentLoaded", function(event) {
        loadCurrentSettings();
        setupEventHandlers();
    });
})();
