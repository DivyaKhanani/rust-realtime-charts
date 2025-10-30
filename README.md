# 🦀⚛️ Rustify Hackathon 2025

A modern, high-performance hackathon boilerplate combining Rust's computational power with React's UI capabilities. Build fast, deploy faster!

## 🚀 [Live Demo](https://rust-wasm-react-hackathon-qe5ek4r8d-thayalangrs-projects.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ThayalanGR/rustify-hackathon-2025)

## ✨ Features

- 🦀 **Rust + WebAssembly**: High-performance computations in the browser
- ⚛️ **React + TypeScript**: Modern UI with type safety  
- 📊 **Data Processing**: CSV upload, statistical analysis, visualization
- 🧮 **Algorithm Demos**: Fibonacci, prime numbers, Monte Carlo π
- 👷 **Web Workers**: Non-blocking UI during heavy computations
- 📱 **Responsive Design**: Works on desktop and mobile
- 🚀 **Production Ready**: Optimized builds and deployment configs

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │───▶│   Web Worker    │───▶│   Rust (WASM)   │
│                 │    │                 │    │                 │
│ • Data Input    │    │ • WASM Loading  │    │ • Statistics    │
│ • CSV Upload    │    │ • Async Bridge  │    │ • Processing    │
│ • Visualization │    │ • Error Handle  │    │ • Algorithms    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or later)
- **Rust** (latest stable)
- **wasm-pack**: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`

### One-Command Setup

```bash
git clone https://github.com/ThayalanGR/rustify-hackathon-2025.git
cd rustify-hackathon-2025
npm install
npm run build
```

## 🛠️ Development

### Start Development (Hot Reload)

```bash
npm run dev
```

This starts both Rust and React development servers with hot reload:
- 🦀 **Rust Hot Reload**: Watches `rust-core/src/**/*.rs` files
- ⚡ **Auto WASM Build**: Rebuilds WASM when Rust code changes  
- ⚛️ **Client Hot Reload**: React dev server with HMR

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development with hot reload |
| `npm run dev:rust` | Start only Rust development server |
| `npm run dev:client` | Start only React development server |
| `npm run build` | Build for production |
| `npm run build:rust` | Build only Rust WASM module |
| `npm run build:client` | Build only React client |
| `npm run clean` | Clean all build artifacts |

## 📁 Project Structure

```
rustify-hackathon-2025/
├── 🦀 rust-core/                 # Rust WebAssembly module
│   ├── src/
│   │   ├── lib.rs                # Main Rust library with WASM exports
│   │   └── utils.rs              # Utility functions (primes, π, etc.)
│   ├── Cargo.toml               # Rust dependencies
│   ├── build.sh                 # Production WASM build
│   └── dev.sh                   # Development with hot reload
│
├── ⚛️ client/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── DataInput.tsx    # CSV upload and input
│   │   │   ├── ResultsDisplay.tsx # Charts and results
│   │   │   └── FibonacciCalculator.tsx # Demo calculator
│   │   ├── worker/
│   │   │   └── dataWorker.ts    # Web Worker for WASM integration
│   │   ├── wasm/
│   │   │   ├── index.ts         # WASM integration layer
│   │   │   └── package/         # Generated WASM bundle
│   │   ├── App.tsx              # Main React component
│   │   └── main.tsx             # React entry point
│   ├── public/                  # Static assets
│   ├── package.json             # Node.js dependencies
│   └── vite.config.ts           # Vite configuration
│
├── 📋 package.json              # Workspace scripts and dependencies
├── 🚀 vercel.json               # Vercel deployment config  
└── 🏗️ build.sh                 # Production build script
```

## 🚀 Deployment

### Vercel (Recommended)

**One-Click Deploy:**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ThayalanGR/rustify-hackathon-2025)

**Manual Deploy:**
```bash
npm i -g vercel
vercel --prod
```

### Other Platforms

```bash
# Build for production
npm run build

# Deploy the client/dist/ directory to your hosting platform
# Files are in: client/dist/
```

## 🔧 Development Environment Setup

### macOS Users: Rust Compilation Fix

If you encounter `ld: library 'System' not found` errors:

```bash
# Run the fix script
./fix-rust-env.sh

# Or manually add to your ~/.zshrc:
echo 'export LIBRARY_PATH="$(xcrun --show-sdk-path)/usr/lib:$LIBRARY_PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Verify Installation

```bash
# Check Rust
rustc --version
wasm-pack --version

# Check Node.js  
node --version
npm --version

# Test Rust compilation
cd rust-core && cargo check
```

## 🎯 Usage Examples

### Data Processing
1. Upload a CSV file with numerical data
2. View statistical analysis (mean, median, std dev)
3. See data visualization charts
4. Compare processing performance

### Algorithm Demos
- **Fibonacci**: Calculate sequences up to 40 numbers
- **Prime Numbers**: Find primes up to 10,000
- **Monte Carlo π**: Estimate π with various iteration counts
- **Matrix Multiplication**: Demo linear algebra operations

### Performance Testing
- Compare Rust WASM vs JavaScript performance
- Observe non-blocking UI with Web Workers
- Test with different data sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [rust-wasm-react-hackathon.vercel.app](https://rust-wasm-react-hackathon-qe5ek4r8d-thayalangrs-projects.vercel.app)
- **Repository**: [github.com/ThayalanGR/rustify-hackathon-2025](https://github.com/ThayalanGR/rustify-hackathon-2025)
- **Issues**: [github.com/ThayalanGR/rustify-hackathon-2025/issues](https://github.com/ThayalanGR/rustify-hackathon-2025/issues)

---

**Built with ❤️ for hackathon developers who want to move fast without breaking things!** 🚀