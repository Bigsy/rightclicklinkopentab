#!/bin/bash

# Firefox Extension Build Script
# Creates a ZIP file ready for Firefox Add-ons submission

echo "Building Firefox extension..."

# Clean any existing build
rm -f rightclick-firefox-extension.zip

# Create ZIP file from src directory contents
cd src
zip -r ../rightclick-firefox-extension.zip .
cd ..

echo "Extension built: rightclick-firefox-extension.zip"
echo ""
echo "To submit to Firefox Add-ons:"
echo "1. Go to https://addons.mozilla.org/developers/"
echo "2. Click 'Submit a New Add-on'"
echo "3. Upload rightclick-firefox-extension.zip"
echo ""
echo "For local testing:"
echo "1. Open Firefox and go to about:debugging"
echo "2. Click 'This Firefox'"
echo "3. Click 'Load Temporary Add-on'"
echo "4. Select any file in the src/ directory"