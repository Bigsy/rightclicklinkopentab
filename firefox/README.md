# Firefox Extension - Right Click Opens Link New Tab

This is the Firefox version of the "Right Click Opens Link New Tab" extension.

## Key Changes from Chrome Version

1. **Manifest Version**: Uses Manifest V2 (Firefox standard)
2. **API Namespace**: Changed from `chrome.*` to `browser.*`
3. **Background Script**: Changed from service worker to background script with persistent: false
4. **Browser Action**: Changed from `action` to `browser_action`
5. **Promises**: Firefox APIs use Promises instead of callbacks
6. **Additional Permissions**: Added "tabs" permission for full functionality

## Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Navigate to the `firefox/src` directory and select `manifest.json`

## Testing

The extension should work identically to the Chrome version:
- Right-click on links to open them in new background tabs
- Configure settings through the extension popup
- Domain blacklisting functionality preserved
- Tab ordering logic maintained

## Building for Production

To create a production build:
1. Zip the contents of the `src` directory (not the directory itself)
2. Submit to Firefox Add-ons: https://addons.mozilla.org/developers/