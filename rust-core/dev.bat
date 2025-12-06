@echo off
setlocal enabledelayedexpansion

echo 🦀 Starting Rust Development Server...
echo 📁 Watching: rust-core/src/**/*.rs
echo 🎯 Target: WebAssembly (wasm32-unknown-unknown)
echo.

REM Check if wasm-pack is installed
where wasm-pack >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ wasm-pack is not installed.
    echo Please install it with: cargo install wasm-pack
    exit /b 1
)

REM Initial build
echo 🔨 Initial WASM build...
call wasm-pack build --target web --out-dir ../client/src/wasm/package --dev

if %errorlevel% neq 0 (
    echo ❌ Initial WASM build failed
    exit /b 1
)

REM Copy to public/pkg
if not exist "..\client\public\pkg" mkdir "..\client\public\pkg"
copy "..\client\src\wasm\package\rw_lttb_bg.wasm" "..\client\public\pkg\" >nul
copy "..\client\src\wasm\package\rw_lttb.js" "..\client\public\pkg\" >nul

echo ✅ Initial build complete!
echo 👀 Watching for changes... (Press Ctrl+C to stop)
echo.

REM Watch for changes using cargo watch if available
where cargo-watch >nul 2>&1
if %errorlevel% equ 0 (
    cargo watch -i .gitignore -i "target/*" -s "wasm-pack build --target web --out-dir ../client/src/wasm/package --dev && xcopy /Y /Q ..\client\src\wasm\package\rw_lttb_bg.wasm ..\client\public\pkg\ && xcopy /Y /Q ..\client\src\wasm\package\rw_lttb.js ..\client\public\pkg\"
) else (
    echo ⚠️  cargo-watch not found. Install it for auto-rebuild: cargo install cargo-watch
    echo Running single build only...
    pause
)
