#!/bin/bash

# neuro-orch Development Environment Setup
# This script checks dependencies and installs required packages

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Minimum Node.js version required
MIN_NODE_VERSION=18

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS=$(detect_os)

echo "======================================"
echo "  neuro-orch Environment Setup"
echo "======================================"
echo ""
echo -e "${BLUE}Detected OS: ${OS}${NC}"
echo ""

# Function to install Homebrew on macOS
install_homebrew() {
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
}

# Function to install Node.js
install_nodejs() {
    echo -e "${YELLOW}Installing Node.js v${MIN_NODE_VERSION}...${NC}"
    echo ""
    
    case "$OS" in
        macos)
            # Check for Homebrew
            if ! command -v brew &> /dev/null; then
                echo -e "${YELLOW}Homebrew not found. Installing Homebrew first...${NC}"
                install_homebrew
            fi
            
            echo "Using Homebrew to install Node.js..."
            brew install node@${MIN_NODE_VERSION}
            
            # Link node if needed
            brew link --overwrite node@${MIN_NODE_VERSION} 2>/dev/null || true
            
            # Add to PATH if installed via brew
            if [[ -d "/opt/homebrew/opt/node@${MIN_NODE_VERSION}/bin" ]]; then
                export PATH="/opt/homebrew/opt/node@${MIN_NODE_VERSION}/bin:$PATH"
            elif [[ -d "/usr/local/opt/node@${MIN_NODE_VERSION}/bin" ]]; then
                export PATH="/usr/local/opt/node@${MIN_NODE_VERSION}/bin:$PATH"
            fi
            ;;
            
        linux)
            # Detect package manager and install
            if command -v apt-get &> /dev/null; then
                echo "Using apt to install Node.js..."
                # Add NodeSource repository for latest Node.js
                curl -fsSL https://deb.nodesource.com/setup_${MIN_NODE_VERSION}.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v dnf &> /dev/null; then
                echo "Using dnf to install Node.js..."
                curl -fsSL https://rpm.nodesource.com/setup_${MIN_NODE_VERSION}.x | sudo bash -
                sudo dnf install -y nodejs
            elif command -v yum &> /dev/null; then
                echo "Using yum to install Node.js..."
                curl -fsSL https://rpm.nodesource.com/setup_${MIN_NODE_VERSION}.x | sudo bash -
                sudo yum install -y nodejs
            elif command -v pacman &> /dev/null; then
                echo "Using pacman to install Node.js..."
                sudo pacman -S nodejs npm
            else
                echo -e "${RED}Could not detect package manager.${NC}"
                echo "Please install Node.js v${MIN_NODE_VERSION}+ manually from https://nodejs.org"
                exit 1
            fi
            ;;
            
        windows)
            echo -e "${RED}Automatic Node.js installation not supported on Windows.${NC}"
            echo "Please install Node.js v${MIN_NODE_VERSION}+ from https://nodejs.org"
            echo "Or use: winget install OpenJS.NodeJS.LTS"
            exit 1
            ;;
            
        *)
            echo -e "${RED}Unknown operating system.${NC}"
            echo "Please install Node.js v${MIN_NODE_VERSION}+ manually from https://nodejs.org"
            exit 1
            ;;
    esac
}

# 1. Check and install Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed${NC}"
    read -p "Would you like to install Node.js v${MIN_NODE_VERSION}? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
    else
        echo -e "${RED}Node.js is required. Exiting.${NC}"
        exit 1
    fi
fi

# Verify Node.js is now available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js installation failed or not in PATH${NC}"
    echo "Please install Node.js v${MIN_NODE_VERSION}+ manually from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
    echo -e "${YELLOW}Node.js v${MIN_NODE_VERSION}+ required (found v${NODE_VERSION})${NC}"
    read -p "Would you like to upgrade Node.js? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
        # Re-check version
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
            echo -e "${RED}Error: Node.js upgrade failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Node.js v${MIN_NODE_VERSION}+ is required. Exiting.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Check npm (comes with Node.js)
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed (should come with Node.js)${NC}"
    echo "Try reinstalling Node.js from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# 3. Change to project root and install dependencies
cd "$PROJECT_ROOT"
echo ""
echo "Installing npm dependencies..."
npm install

# 4. Verify node-pty (requires native compilation)
echo ""
if [ ! -d "node_modules/node-pty" ]; then
    echo -e "${YELLOW}Warning: node-pty not found${NC}"
    echo "Terminal functionality may not work correctly."
    echo ""
    echo "On macOS, you may need Xcode Command Line Tools:"
    echo "  xcode-select --install"
    echo ""
    echo "On Linux, you may need build tools:"
    echo "  sudo apt-get install -y build-essential"
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
