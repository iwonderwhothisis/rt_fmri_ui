#!/bin/bash

# neuro-orch Development Environment Setup
# This script checks dependencies and installs required packages

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Minimum Node.js version required
MIN_NODE_VERSION=18

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

echo "======================================"
echo "  neuro-orch Environment Setup"
echo "======================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js v${MIN_NODE_VERSION}+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
    echo -e "${RED}Error: Node.js v${MIN_NODE_VERSION}+ required (found v${NODE_VERSION})${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# 3. Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# 4. Verify node-pty (requires native compilation)
if [ ! -d "node_modules/node-pty" ]; then
    echo -e "${RED}Warning: node-pty not found${NC}"
    echo "Terminal functionality may not work"
else
    echo -e "${GREEN}✓ node-pty installed${NC}"
fi

# 5. Success message
echo ""
echo -e "${GREEN}======================================"
echo "  Setup Complete!"
echo "======================================${NC}"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "This will start both:"
echo "  - Frontend (Vite) on http://localhost:5173"
echo "  - Backend (Express) on http://localhost:3001"
