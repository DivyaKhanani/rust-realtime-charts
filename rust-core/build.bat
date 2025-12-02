@echo off
setlocal enabledelayedexpansion

echo 🦀 Building Rust WebAssembly module...

REM Check if wasm-pack is installed
where wasm-pack >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ wasm-pack is not installed.
    echo Please install it with: cargo install wasm-pack
    exit /b 1
)

REM Build the WebAssembly module for web target
echo 🔨 Running wasm-pack build for web...
call wasm-pack build --target web --out-dir ../client/src/wasm/package --release

if %errorlevel% neq 0 (
    echo ❌ WASM build failed
    exit /b 1
)

REM Create public/pkg directory if it doesn't exist
echo 📦 Copying WASM to public/pkg...
if not exist "..\client\public\pkg" mkdir "..\client\public\pkg"

REM Copy files
copy "..\client\src\wasm\package\rw_lttb_bg.wasm" "..\client\public\pkg\" >nul
copy "..\client\src\wasm\package\rw_lttb.js" "..\client\public\pkg\" >nul

echo ✅ WASM build complete!
echo 📦 Generated files in:
echo    - client/src/wasm/package/ (for bundler import)
echo    - client/public/pkg/ (for worker direct import)
if exist "..\client\public\pkg\rw_lttb_bg.wasm" (
    echo    Files ready!
)

echo 🎉 Ready to use in your React application!
