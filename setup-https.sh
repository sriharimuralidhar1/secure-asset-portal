#!/bin/bash

# Setup HTTPS certificates for local development
# This is required for WebAuthn to work on mobile devices

echo "🔐 Setting up HTTPS certificates for Secure Asset Portal..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert is not installed. Please install it first:"
    echo ""
    echo "On macOS: brew install mkcert"
    echo "On Linux: wget https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64"
    echo "On Windows: choco install mkcert"
    echo ""
    exit 1
fi

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  Could not detect local IP address. Using default configuration."
    LOCAL_IP="192.168.1.100"
fi

echo "🌐 Detected local IP: $LOCAL_IP"

# Install the local CA
echo "🏛️  Installing local CA..."
mkcert -install

# Create certs directory
mkdir -p certs

# Generate certificates
echo "📜 Generating certificates for localhost and local IP..."
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 $LOCAL_IP ::1

echo "✅ HTTPS certificates generated successfully!"
echo ""
echo "📱 Your mobile device can now access the app at:"
echo "   https://$LOCAL_IP:3001"
echo ""
echo "🚀 Start the development server with: npm run dev"
echo ""
echo "Note: The first time you access the HTTPS URL on your mobile device,"
echo "you may see a security warning. This is normal for self-signed certificates."
echo "Accept the certificate to continue."
