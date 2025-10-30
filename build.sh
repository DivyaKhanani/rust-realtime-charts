#!/bin/bash

set -e

# Note: macOS linking fix is now set globally in shell profile

# 🚀 Production Build Script for Rust + React + WASM Application

echo "🚀 Building Rust + React + WASM Application"

# Colors for output

echo "🚀 Production Build: Rust → WASM → React"RED='\033[0;31m'

echo ""GREEN='\033[0;32m'

YELLOW='\033[1;33m'

# Build Rust WebAssembly moduleNC='\033[0m' # No Color

echo "🦀 Building Rust WebAssembly module..."

cd rust-core# Function to print colored output

print_status() {

# Check if wasm-pack is installed    echo -e "${GREEN}[INFO]${NC} $1"

if ! command -v wasm-pack &> /dev/null; then}

    echo "❌ wasm-pack is not installed."

    echo "📦 Install it with: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"print_warning() {

    echo "⚠️  Using JavaScript fallback instead."    echo -e "${YELLOW}[WARNING]${NC} $1"

    cd ../client}

else

    # Build with wasm-pack for productionprint_error() {

    if wasm-pack build --target web --out-dir ../client/src/wasm --out-name rust_core --release; then    echo -e "${RED}[ERROR]${NC} $1"

        echo "✅ WASM module built successfully!"}

        

        # Copy WASM file to public directory# Check if we're in the root directory

        if [ -f "../client/src/wasm/rust_core_bg.wasm" ]; thenif [ ! -f "rust-core/Cargo.toml" ] || [ ! -f "client/package.json" ]; then

            cp "../client/src/wasm/rust_core_bg.wasm" "../client/public/"    print_error "This script must be run from the project root directory"

            echo "📦 WASM file ready for production"    exit 1

        fifi

    else

        echo "⚠️  WASM build failed. Using JavaScript fallback."# Check if wasm-pack is installed

    fiif ! command -v wasm-pack &> /dev/null; then

        print_warning "wasm-pack not found. Installing..."

    cd ../client    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

fi    

    # Add to PATH for current session

# Install and build client    export PATH="$HOME/.cargo/bin:$PATH"

echo ""    

echo "⚛️  Building React client..."    if ! command -v wasm-pack &> /dev/null; then

        print_error "Failed to install wasm-pack"

if [ ! -d "node_modules" ]; then        exit 1

    echo "📦 Installing dependencies..."    fi

    npm installfi

fi

# Check if Node.js is installed

if npm run build; thenif ! command -v npm &> /dev/null; then

    echo "✅ Client built successfully!"    print_error "Node.js/npm not found. Please install Node.js first."

    echo ""    exit 1

    echo "🎉 Production build complete!"fi

    echo "📁 Output: client/dist/"

    echo ""print_status "Building Rust WebAssembly module..."

    echo "🚀 Deploy with:"cd rust-core

    echo "   vercel --prod"

    echo "   or serve client/dist/"# Clean previous builds

elserm -rf ../client/src/wasm/pkg 2>/dev/null || true

    echo "❌ Client build failed"

    exit 1# Build WASM module

fiif ! wasm-pack build --target web --out-dir ../client/src/wasm --dev; then

    print_warning "WASM build failed. Using mock implementation."

cd ..    print_status "This is normal if you don't have the proper Rust toolchain setup."
    print_status "The application will still work with JavaScript fallbacks."
else
    print_status "✅ WASM module built successfully!"
fi

cd ..

print_status "Installing client dependencies..."
cd client

# Install dependencies if node_modules doesn't exist or is outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
else
    print_status "Dependencies already up to date"
fi

print_status "✅ Build process completed!"
print_status ""
print_status "🎉 Your application is ready!"
print_status ""
print_status "To start development server:"
print_status "  cd client && npm run dev"
print_status ""
print_status "To build for production:"
print_status "  cd client && npm run build"
print_status ""
print_status "To preview production build:"
print_status "  cd client && npm run preview"