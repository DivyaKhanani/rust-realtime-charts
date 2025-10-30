# 🏗️ Project Structure

This document outlines the clean, minimal structure of the Rust + WASM + React hackathon boilerplate.

## 📁 Directory Structure

```
rustify-hackathon-2025/
├── 📄 README.md                    # Main project documentation
├── 📄 LICENSE                      # MIT license
├── 📄 DEPLOYMENT.md                # Deployment instructions
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 package.json                 # Root package.json with convenience scripts
├── 📄 build.sh                     # Main build script (Rust + Client)
├── 📄 vercel.json                  # Vercel deployment configuration
├── 📄 .gitignore                   # Comprehensive gitignore (handles all artifacts)
│
├── 🦀 rust-core/                   # Rust WebAssembly module
│   ├── 📄 Cargo.toml               # Rust dependencies and configuration
│   ├── 📄 Cargo.lock               # Locked dependency versions (committed for reproducibility)
│   ├── 📄 build.sh                 # WASM build script (wasm-pack)
│   └── 📁 src/
│       ├── 📄 lib.rs                # Main Rust library with WASM exports
│       └── 📄 utils.rs              # Utility functions for mathematical operations
│
└── ⚛️ client/                       # React TypeScript frontend
    ├── 📄 package.json              # Node.js dependencies and scripts
    ├── 📄 package-lock.json         # Locked Node.js dependencies
    ├── 📄 index.html                # Main HTML template
    ├── 📄 vite.config.ts            # Vite bundler configuration
    ├── 📄 tsconfig.json             # TypeScript project references
    ├── 📄 tsconfig.app.json         # TypeScript app configuration
    ├── 📄 tsconfig.node.json        # TypeScript Node.js configuration
    ├── 📄 eslint.config.js          # ESLint configuration
    │
    ├── 📁 src/
    │   ├── 📄 main.tsx               # React app entry point
    │   ├── 📄 App.tsx                # Main App component
    │   ├── 📄 App.css                # Complete design system and styles
    │   ├── 📄 index.css              # CSS reset only
    │   │
    │   ├── 🧩 components/            # React components
    │   │   ├── 📄 DataInput.tsx      # CSV data input component
    │   │   ├── 📄 ResultsDisplay.tsx # Data processing results display
    │   │   ├── 📄 FibonacciCalculator.tsx # Fibonacci calculation component
    │   │   └── 📄 MathDemo.tsx       # Mathematical operations demo
    │   │
    │   ├── 👷 worker/                # Web Worker for WASM execution
    │   │   ├── 📄 dataWorker.ts      # Main Web Worker implementation
    │   │   └── 📄 workerManager.ts   # Shared worker manager (singleton)
    │   │
    │   └── 🔗 wasm/                  # WASM integration layer
    │       ├── 📄 index.ts           # WASM TypeScript wrapper (committed)
    │       ├── 📄 rust_core.d.ts     # WASM type definitions (generated, ignored)
    │       ├── 📄 rust_core.js       # WASM JavaScript bindings (generated, ignored)
    │       ├── 📄 rust_core_bg.wasm  # Compiled WASM module (generated, ignored)
    │       ├── 📄 rust_core_bg.wasm.d.ts # WASM types (generated, ignored)
    │       └── 📄 package.json       # Generated package.json (ignored)
    │
    └── 📁 public/                    # Static assets served by Vite
        └── 📄 rust_core_bg.wasm      # WASM file copied for browser loading
```

## 🗂️ File Categories

### 📝 **Committed Source Files**
- All `.rs`, `.ts`, `.tsx`, `.css`, `.html`, `.json` configuration files
- Documentation files (`.md`)
- Build scripts (`.sh`)
- WASM wrapper (`client/src/wasm/index.ts`)

### 🚫 **Ignored Generated Files**
- `rust-core/target/` - Rust build artifacts
- `client/node_modules/` - Node.js dependencies
- `client/dist/` - Production build output
- `client/src/wasm/*.js`, `*.wasm`, `*.d.ts` - Generated WASM bindings
- `.vercel/` - Vercel deployment artifacts

### 🔄 **Build Process**
1. **Rust → WASM**: `rust-core/build.sh` → generates files in `client/src/wasm/`
2. **WASM → Public**: Copies `.wasm` file to `client/public/`
3. **React Build**: `client/` → generates production build in `client/dist/`

## 🛠️ **Development Workflow**

### Initial Setup
```bash
git clone <repo>
cd rustify-hackathon-2025
npm install          # Install client dependencies
npm run build:wasm   # Build WASM module
npm run dev          # Start development server
```

### Clean Builds
```bash
npm run clean        # Clean all build artifacts
npm run clean:wasm   # Clean only WASM artifacts
npm run build        # Full production build
```

### Development
```bash
npm run dev          # Start dev server (uses existing WASM)
npm run build:wasm   # Rebuild WASM when Rust code changes
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## 🎯 **Design Principles**

### ✨ **Minimalism**
- No unnecessary files or configurations
- Single responsibility for each file
- Clear separation of concerns

### 🔄 **Reproducible Builds**
- Locked dependencies (`Cargo.lock`, `package-lock.json`)
- Comprehensive `.gitignore` for generated files
- Clear build scripts with proper error handling

### 🚀 **Performance**
- WASM for computationally intensive tasks
- Web Workers to prevent UI blocking
- Optimized production builds with Vite

### 🛡️ **Type Safety**
- Full TypeScript coverage
- Proper WASM type definitions
- Strict TypeScript configuration

### 📱 **Modern Standards**
- ES2022+ JavaScript
- Modern React patterns (hooks, functional components)
- Contemporary CSS with custom properties
- Proper accessibility considerations

## 🔧 **Configuration Highlights**

- **Vite**: Modern bundler with HMR and optimizations
- **TypeScript**: Strict mode with comprehensive linting
- **ESLint**: Modern configuration for code quality
- **Vercel**: Optimized deployment with client-only builds
- **WASM**: Efficient Rust compilation with wasm-pack

This structure provides a solid foundation for hackathon projects requiring high-performance computing with modern web technologies.