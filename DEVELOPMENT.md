# 🚀 Minimal Development Workflow

This project has been streamlined to have just **2 essential commands**:

## 🛠️ Development (with Hot Reload)

```bash
npm run dev
```

**What this does:**
- 🦀 **Rust Hot Reload**: Watches `rust-core/src/**/*.rs` files
- ⚡ **Auto WASM Build**: Rebuilds WASM when Rust code changes  
- 📦 **Auto Bundle**: Updates client with new WASM automatically
- ⚛️ **Client Hot Reload**: React dev server with HMR
- 👀 **Live Output**: See Rust compilation output in real-time

**Separate Dev Servers (if needed):**
```bash
# Terminal 1: Rust development with file watching
npm run dev:rust

# Terminal 2: Client development  
npm run dev:client
```

## 🎯 Production Build

```bash
npm run build
```

**What this does:**
- 🦀 **Optimized Rust**: Release build with `--release` flag
- 📦 **WASM Bundle**: Generates optimized WASM module
- ⚛️ **Client Bundle**: Production React build in `client/dist/`
- 🚀 **Deploy Ready**: Output ready for Vercel/static hosting

## 🧹 Cleanup

```bash
npm run clean
```

Removes all build artifacts (target/, dist/, node_modules/, WASM files).

---

## 🔥 Hot Reload Features

### Rust Development
- **File Watching**: Uses `cargo-watch` to monitor Rust source files
- **Fast Rebuilds**: Incremental compilation for quick iterations
- **Visible Output**: See compilation errors and warnings immediately
- **Auto WASM**: Automatically generates WASM when Rust builds succeed

### Client Development  
- **Vite HMR**: Instant hot module replacement for React components
- **WASM Updates**: Automatically picks up new WASM modules
- **Live Refresh**: Browser updates when WASM changes
- **Fast Feedback**: See changes in seconds, not minutes

## 📊 Development Flow

```
Rust Code Change → cargo-watch detects → Rust compiles → WASM generated → Client hot reloads
     ↑                                                                            ↓
     └────────────────────── See results in browser ←──────────────────────────┘
```

This streamlined setup gives you the **fastest possible development experience** with minimal commands and maximum productivity! 🎉