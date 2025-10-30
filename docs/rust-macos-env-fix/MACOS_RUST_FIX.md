# macOS Rust Environment Fix

## Problem
On macOS 26.0.1 (and some other recent macOS versions), Rust compilation fails with the error:
```
ld: library 'System' not found
```

This happens because the linker cannot find the macOS System library during build script compilation.

## Solution Applied
Added the following line to your shell profile (`~/.zshrc`):

```bash
export LIBRARY_PATH="$(xcrun --show-sdk-path)/usr/lib:$LIBRARY_PATH"
```

## What This Does
- Points the linker to the correct macOS SDK library path
- Resolves the System library linking issue
- Works for all Rust compilation (not just WASM)
- Applied globally so it works in any terminal session

## Verification
The fix is working if these commands succeed without errors:
```bash
cd rust-core
cargo check
cargo build
wasm-pack build --target web
```

## Files Modified
1. **Added to shell profile**: `~/.zshrc`
2. **Installation script**: `fix-rust-env.sh` (can be deleted after use)
3. **Updated build scripts**: Removed redundant LIBRARY_PATH exports since it's now global

## Industry Standard
This is the standard solution recommended for macOS Rust development environments experiencing System library linking issues.