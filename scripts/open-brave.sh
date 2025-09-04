#!/bin/bash

# Script to open the React development server in Brave Browser
# Usage: ./scripts/open-brave.sh [port]

PORT=${1:-3001}
URL="http://localhost:$PORT"

echo "🚀 Opening $URL in Brave Browser..."

# Check if Brave Browser is installed
if [ ! -d "/Applications/Brave Browser.app" ]; then
    echo "❌ Brave Browser not found in /Applications/"
    echo "Please install Brave Browser or update the path in this script"
    exit 1
fi

# Open URL in Brave Browser
open -a "Brave Browser" "$URL"

echo "✅ Brave Browser should now open with $URL"
