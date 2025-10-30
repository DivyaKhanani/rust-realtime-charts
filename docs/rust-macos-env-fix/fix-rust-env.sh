#!/bin/bash

# 🔧 macOS Rust Environment Fix
# This script adds the macOS linking fix to your shell profile permanently

set -e

echo "🔧 Installing macOS Rust environment fix..."

# Define the fix line
RUST_FIX='export LIBRARY_PATH="$(xcrun --show-sdk-path)/usr/lib:$LIBRARY_PATH"'

# Check which shell profile to use
if [[ "$SHELL" == *"zsh"* ]]; then
    PROFILE_FILE="$HOME/.zshrc"
    echo "📝 Adding fix to .zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    PROFILE_FILE="$HOME/.bash_profile"
    echo "📝 Adding fix to .bash_profile"
else
    PROFILE_FILE="$HOME/.profile"
    echo "📝 Adding fix to .profile"
fi

# Check if the fix is already present
if grep -q "xcrun --show-sdk-path" "$PROFILE_FILE" 2>/dev/null; then
    echo "✅ Fix already present in $PROFILE_FILE"
else
    echo "" >> "$PROFILE_FILE"
    echo "# Fix for macOS Rust compilation linking issue" >> "$PROFILE_FILE"
    echo "$RUST_FIX" >> "$PROFILE_FILE"
    echo "✅ Added Rust environment fix to $PROFILE_FILE"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To apply the fix immediately, run:"
echo "  source $PROFILE_FILE"
echo ""
echo "Or open a new terminal session."
echo ""
echo "🧪 Test the fix with:"
echo "  cd rust-core && cargo check"