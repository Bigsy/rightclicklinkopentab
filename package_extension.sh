#!/bin/bash

# Remove any existing package
rm -f extension.zip

# Create a zip file containing the extension files
cd src && zip -r ../extension.zip \
    manifest.json \
    config/ \
    css/ \
    icons/ \
    img/ \
    js/ \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*/.idea/*"

echo "Extension has been packaged as extension.zip"
