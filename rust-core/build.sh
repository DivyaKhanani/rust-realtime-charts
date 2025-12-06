#!/bin/bash
set -e

echo "🦀 Building Rust WebAssembly module..."

# Ensure we're in the rust-core directory
cd "$(dirname "$0")"

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack is not installed. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WebAssembly module for web target
echo "🔨 Running wasm-pack build for web..."
wasm-pack build --target web --out-dir ../client/src/wasm/package --release

# Also copy to public/pkg for direct access
echo "📦 Copying WASM to public/pkg..."
mkdir -p ../client/public/pkg
cp ../client/src/wasm/package/rw_lttb_bg.wasm ../client/public/pkg/
cp ../client/src/wasm/package/rw_lttb.js ../client/public/pkg/

echo "✅ WASM build complete!"
echo "📦 Generated files in:"
echo "   - client/src/wasm/package/ (for bundler import)"
echo "   - client/public/pkg/ (for worker direct import)"
ls -la ../client/public/pkg/ 2>/dev/null || echo "   (files ready)"

echo "🎉 Ready to use in your React application!"