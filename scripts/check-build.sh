#!/bin/bash

npm run build

echo "Checking build structure..."
ls -R dist/

if [ -f "dist/server/server/index.js" ]; then
    echo "Server build found at correct location"
else
    echo "Server build not found at expected location"
    exit 1
fi 