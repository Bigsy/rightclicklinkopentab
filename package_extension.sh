#!/bin/bash

# Run tests first
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Aborting package creation."
    exit 1
fi

# Remove any existing package
rm -f extension.zip

# Create a zip file containing the extension files
cd src && zip -r ../extension.zip \
    manifest.json \
    config/ \
    css/ \
    icons/ \
    images/ \
    img/ \
    js/ \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*/.idea/*" \
    -x "*/tests/*" \
    -x "*/node_modules/*" \
    -x "*/package.json" \
    -x "*/package-lock.json"

echo "Extension has been packaged as extension.zip"
