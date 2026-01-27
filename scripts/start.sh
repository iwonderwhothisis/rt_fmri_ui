#!/bin/bash

# neuro-orch Launch Script
# Starts the development server with production commands and opens the browser

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=8080
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
COMMANDS_CONFIG="${COMMANDS_CONFIG:-commands_production.yaml}"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect OS for browser opening
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS=$(detect_os)

# Function to open browser based on OS
open_browser() {
    local url="$1"
    echo -e "${BLUE}Opening browser at ${url}${NC}"
    
    case "$OS" in
        macos)
            open "$url"
            ;;
        linux)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$url"
            elif command -v gnome-open &> /dev/null; then
                gnome-open "$url"
            elif command -v kde-open &> /dev/null; then
                kde-open "$url"
            elif command -v sensible-browser &> /dev/null; then
                sensible-browser "$url"
            else
                echo -e "${YELLOW}Could not detect browser. Please open manually: ${url}${NC}"
            fi
            ;;
        windows)
            start "$url"
            ;;
        *)
            echo -e "${YELLOW}Unknown OS. Please open manually: ${url}${NC}"
            ;;
    esac
}

# Function to wait for server to be ready
wait_for_server() {
    local url="$1"
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}Waiting for server to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "200\|304"; then
            echo -e "${GREEN}Server is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${YELLOW}Server may not be fully ready, opening browser anyway...${NC}"
    return 0
}

# Main execution
echo ""
echo -e "${GREEN}======================================"
echo "  neuro-orch Development Server"
echo "======================================${NC}"
echo ""
echo -e "Config: ${BLUE}${COMMANDS_CONFIG}${NC}"
echo -e "URL:    ${BLUE}${FRONTEND_URL}${NC}"
echo ""

cd "$PROJECT_ROOT"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    npm install
fi

# Start the server in background and wait for it to be ready
echo -e "${BLUE}Starting development server...${NC}"
echo ""

# Export the config and start, opening browser once ready
export COMMANDS_CONFIG="$COMMANDS_CONFIG"

# Start server in background, wait for ready, then open browser
(
    sleep 3  # Give the server a moment to start
    wait_for_server "$FRONTEND_URL"
    open_browser "$FRONTEND_URL"
) &

# Run the dev server (this will block)
npm run dev
