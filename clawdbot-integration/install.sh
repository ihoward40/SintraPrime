#!/bin/bash
# ClawdBot Installation Script for SintraPrime
# This script helps install ClawdBot while ensuring governance compliance

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ClawdBot Installation Script for SintraPrime${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

# Function to print errors
print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Governance warning
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    GOVERNANCE WARNING${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Before installing ClawdBot, ensure you have reviewed:"
echo "  • Policy SP-AGENT-ENV-001 (Environment Isolation)"
echo "  • Policy SP-AGENT-ACCT-002 (Least Privilege)"
echo "  • Policy SP-AGENT-MODE-003 (Two-Mode Operations)"
echo "  • Policy SP-AGENT-EXEC-004 (Execute Requires Consent)"
echo "  • Policy SP-SKILL-GOV-005 (Skill Governance)"
echo ""
echo "See: /docs/policy/clawdbot-agent-policy-snippets.v1.md"
echo ""
read -p "Have you reviewed the governance policies? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please review governance policies before proceeding."
    exit 1
fi

# Environment check
print_section "Environment Check"
echo ""

# Check if running on dedicated machine
print_warning "You MUST run ClawdBot on a dedicated machine or VPS."
print_warning "DO NOT install on your primary daily-use computer."
echo ""
read -p "Are you on a dedicated machine/VPS? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Installation aborted. Policy SP-AGENT-ENV-001 requires dedicated environment."
    exit 1
fi

print_success "Environment check passed"
echo ""

# Check Node.js version
print_section "Checking Node.js version"
if ! command_exists node; then
    print_error "Node.js is not installed."
    echo "ClawdBot requires Node.js 22 or higher."
    echo "Install from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 22 ]; then
    print_error "Node.js version $NODE_VERSION is too old."
    echo "ClawdBot requires Node.js 22 or higher."
    echo "Current version: $NODE_VERSION"
    exit 1
fi

print_success "Node.js $NODE_VERSION detected"
echo ""

# Check npm
print_section "Checking npm"
if ! command_exists npm; then
    print_error "npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm $NPM_VERSION detected"
echo ""

# Installation method selection
print_section "Select Installation Method"
echo ""
echo "1) Global installation (recommended)"
echo "   - Install ClawdBot globally on system"
echo "   - Can be run from anywhere"
echo ""
echo "2) Local installation (sandboxed)"
echo "   - Install in clawdbot-integration directory"
echo "   - Isolated from other projects"
echo ""
echo "3) From source (development)"
echo "   - Clone and build from GitHub"
echo "   - For customization and development"
echo ""
read -p "Choose installation method (1-3): " -n 1 -r METHOD
echo
echo ""

case $METHOD in
    1)
        print_section "Installing ClawdBot globally"
        echo ""
        print_warning "You may need to use sudo depending on your npm configuration."
        echo ""
        
        if npm install -g clawdbot; then
            print_success "ClawdBot installed globally"
        else
            print_error "Failed to install ClawdBot globally"
            exit 1
        fi
        ;;
    
    2)
        print_section "Installing ClawdBot locally"
        echo ""
        cd "$SCRIPT_DIR"
        
        # Initialize package.json if not exists
        if [ ! -f "package.json" ]; then
            print_warning "package.json not found. Run this from clawdbot-integration directory."
            exit 1
        fi
        
        if npm install clawdbot; then
            print_success "ClawdBot installed locally"
        else
            print_error "Failed to install ClawdBot locally"
            exit 1
        fi
        ;;
    
    3)
        print_section "Installing ClawdBot from source"
        echo ""
        
        if ! command_exists git; then
            print_error "Git is not installed."
            exit 1
        fi
        
        if ! command_exists pnpm; then
            print_warning "pnpm not found. Installing pnpm..."
            npm install -g pnpm
        fi
        
        cd "$SCRIPT_DIR"
        
        if [ -d "clawdbot" ]; then
            print_warning "clawdbot directory already exists"
            read -p "Remove and reinstall? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf clawdbot
            else
                exit 1
            fi
        fi
        
        print_section "Cloning ClawdBot repository"
        git clone https://github.com/clawdbot/clawdbot.git
        
        cd clawdbot
        
        print_section "Installing dependencies"
        pnpm install
        
        print_section "Building ClawdBot"
        pnpm build
        
        print_success "ClawdBot built from source"
        ;;
    
    *)
        print_error "Invalid selection"
        exit 1
        ;;
esac

echo ""
print_section "Verifying Installation"
echo ""

# Verify installation
if command_exists clawdbot || [ -f "node_modules/.bin/clawdbot" ]; then
    if command_exists clawdbot; then
        VERSION=$(clawdbot --version 2>/dev/null || echo "unknown")
    else
        VERSION=$(npx clawdbot --version 2>/dev/null || echo "unknown")
    fi
    print_success "ClawdBot version $VERSION installed successfully"
else
    print_error "ClawdBot installation could not be verified"
    exit 1
fi

echo ""
print_section "Configuration Setup"
echo ""

# Check for .env file
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    print_warning ".env file not found"
    echo ""
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        read -p "Copy .env.example to .env? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            print_success ".env file created"
            echo ""
            print_warning "IMPORTANT: Edit .env and add your API keys"
            echo "  • ANTHROPIC_API_KEY"
            echo "  • OPENAI_API_KEY"
            echo "  • Other configuration values"
        fi
    fi
else
    print_success ".env file exists"
fi

echo ""
print_section "Next Steps"
echo ""
echo "1. Configure your .env file with API keys"
echo "   - Use service accounts, NOT personal accounts"
echo "   - See .env.example for template"
echo ""
echo "2. Review governance compliance checklist"
echo "   - See GOVERNANCE_COMPLIANCE.md"
echo ""
echo "3. Run the onboarding wizard"
if command_exists clawdbot; then
    echo "   - clawdbot onboard"
else
    echo "   - npx clawdbot onboard"
fi
echo ""
echo "4. Test in Research Mode BEFORE enabling Execute Mode"
if command_exists clawdbot; then
    echo "   - clawdbot chat 'Hello, test message'"
else
    echo "   - npx clawdbot chat 'Hello, test message'"
fi
echo ""
echo "5. Set up monitoring and alerts"
echo "   - Configure Make.com integration"
echo "   - Test alert triggers"
echo ""

print_section "Governance Reminders"
echo ""
echo "✓ ClawdBot MUST run on dedicated machine/VPS"
echo "✓ Use service accounts, NOT personal accounts"
echo "✓ Start in Research Mode, NOT Execute Mode"
echo "✓ Every Execute action requires a receipt"
echo "✓ Enable logging and monitoring"
echo ""

print_section "Documentation References"
echo ""
echo "• ClawdBot Integration README: $SCRIPT_DIR/README.md"
echo "• Governance Compliance Guide: $SCRIPT_DIR/GOVERNANCE_COMPLIANCE.md"
echo "• Policy Snippets: /docs/policy/clawdbot-agent-policy-snippets.v1.md"
echo "• ClawdBot Status: /CLAWDBOT_STATUS.md"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "For support, see:"
echo "  • Official docs: https://getclawdbot.org/docs/"
echo "  • SintraPrime governance: /docs/policy/"
echo ""
