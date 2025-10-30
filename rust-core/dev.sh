#!/bin/bash

# 🦀 Rust Development Server with Hot Reload
# Watches Rust files and rebuilds WASM automatically

set -e

# Note: macOS linking fix is now set globally in shell profile

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🦀 Starting Rust Development Server...${NC}"
echo -e "${YELLOW}📁 Watching: rust-core/src/**/*.rs${NC}"
echo -e "${YELLOW}🎯 Target: WebAssembly (wasm32-unknown-unknown)${NC}"
echo ""

# Function to build WASM
build_wasm() {
    echo -e "${YELLOW}⚡ Rust files changed - rebuilding WASM...${NC}"
    
    # Build WASM with wasm-pack
    if wasm-pack build --target web --out-dir ../client/src/wasm/package --out-name rust_core; then
        echo -e "${GREEN}✅ WASM build successful!${NC}"
        
        # WASM file will be handled by the bundler automatically
        echo -e "${GREEN}📦 WASM file ready for bundler${NC}"
        
        echo -e "${GREEN}🔄 Client will hot-reload automatically${NC}"
    else
        echo -e "${RED}❌ WASM build failed${NC}"
    fi
    echo ""
}

# Initial build
echo -e "${BLUE}🔨 Initial WASM build...${NC}"
build_wasm

# Check if cargo-watch is installed
if ! command -v cargo-watch &> /dev/null; then
    echo -e "${YELLOW}📦 Installing cargo-watch for file watching...${NC}"
    cargo install cargo-watch
fi

# Start watching Rust files
echo -e "${BLUE}👀 Watching for Rust file changes...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

cargo watch -w src -s "echo '⚡ Change detected...' && wasm-pack build --target web --out-dir ../client/src/wasm/package --out-name rust_core && echo '✅ WASM updated!'"