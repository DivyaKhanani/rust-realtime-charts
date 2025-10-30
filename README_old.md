## 🎯 Hackathon Boilerplate: Rust + WebAssembly + React

A modern, high-performance boilerplate for hackathons combining Rust's computational power with React's UI capabilities. Build fast, deploy faster!

### 🚀 [Live Demo](https://rust-wasm-react-hackathon-qe5ek4r8d-thayalangrs-projects.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ThayalanGR/rustify-hackathon-2025)

## 📘 Overview

This application demonstrates:
- **Rust** compiled to **WebAssembly** for high-performance computations
- **React** frontend with **TypeScript** and **Vite** for fast development
- **Web Workers** for non-blocking computational tasks
- **Chart.js** integration for data visualization
- **Production-ready** deployment configuration for Vercel

### 🏗️ Architecture

```plaintext
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │───▶│   Web Worker    │───▶│   Rust (WASM)   │
│                 │    │                 │    │                 │
│ • Data Input    │    │ • WASM Loading  │    │ • Statistics    │
│ • CSV Upload    │    │ • Async Bridge  │    │ • Processing    │
│ • Visualization │    │ • Error Handle  │    │ • Algorithms    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### ✨ Features

- 📊 **CSV Data Processing**: Upload and process large CSV files
- 🔢 **Statistical Analysis**: Mean, median, standard deviation, etc.
- 📈 **Data Visualization**: Interactive charts and graphs
- 🧮 **Fibonacci Calculator**: Performance comparison between Rust and JavaScript
- ⚡ **Web Workers**: Non-blocking UI during heavy computations
- 📱 **Responsive Design**: Works on desktop and mobile
- 🚀 **Production Ready**: Optimized builds and deployment configs

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or later)
- **Rust** (latest stable) with `wasm-pack`
- **Git**

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/ThayalanGR/rustify-hackathon-2025.git
cd rustify-hackathon-2025
npm run build
```

### Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/ThayalanGR/rustify-hackathon-2025.git
cd rustify-hackathon-2025

# 2. Install wasm-pack (if not already installed)
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 3. Build Rust WebAssembly module
cd rust-core
./build.sh
cd ..

# 4. Install client dependencies
cd client
npm install
cd ..
```

## 🛠️ Development

### Start Development Server

```bash
# Method 1: From root directory
npm run dev

# Method 2: From client directory
cd client
npm run dev
```

The application will be available at `http://localhost:5173`

### Development Workflow

1. **Rust Changes**: Edit files in `rust-core/src/`, then run:
   ```bash
   npm run build:wasm
   ```

2. **Frontend Changes**: Edit files in `client/src/`, hot reload is automatic

3. **Full Rebuild**:
   ```bash
   npm run build
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build both Rust and React |
| `npm run build:wasm` | Build only Rust WASM module |
| `npm run build:client` | Build only React client |
| `npm run preview` | Preview production build |
| `npm run clean` | Clean all build artifacts |

## 📁 Project Structure

```
rust-hackathon-boilerplate/
├── 📦 rust-core/                 # Rust WebAssembly module
│   ├── src/
│   │   ├── lib.rs                # Main Rust library
│   │   └── utils.rs              # Utility functions
│   ├── Cargo.toml               # Rust dependencies
│   └── build.sh                 # WASM build script
│
├── 🌐 client/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── DataInput.tsx
│   │   │   ├── ResultsDisplay.tsx
│   │   │   └── FibonacciCalculator.tsx
│   │   ├── worker/
│   │   │   └── dataWorker.ts    # Web Worker for WASM
│   │   ├── wasm/                # Generated WASM files
│   │   ├── App.tsx              # Main React component
│   │   ├── App.css              # Styling
│   │   └── main.tsx             # React entry point
│   ├── package.json             # Node.js dependencies
│   └── vite.config.ts           # Vite configuration
│
├── 🔧 Configuration Files
│   ├── package.json             # Root scripts
│   ├── vercel.json              # Vercel deployment
│   ├── build.sh                 # Main build script
│   └── README.md                # This file
```

## 🧪 Testing the Application

### 1. Basic Functionality

1. **Start the dev server**: `npm run dev`
2. **Test WASM greeting**: Click "Test WASM Module" button
3. **Process simple data**: Enter comma-separated numbers and click "Process Simple Data"
4. **Upload CSV**: Use "Generate Sample CSV" and process it
5. **Calculate Fibonacci**: Enter a number and compare performance

### 2. Performance Testing

The application includes performance metrics to compare Rust/WASM vs JavaScript:

- **Data Processing**: Large datasets show Rust's speed advantage
- **Fibonacci Calculation**: CPU-intensive tasks demonstrate WASM performance
- **Memory Usage**: Monitor browser dev tools during processing

### 3. Browser Compatibility

Tested on:
- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Safari 14+
- ✅ Edge 90+

## 🚢 Production Build & Deployment

### Build for Production

```bash
# Build everything
npm run build

# Or build step by step
npm run build:wasm
npm run build:client
```

### Deploy to Vercel

> **Note**: The deployment uses JavaScript fallback implementations since Rust/WASM compilation requires additional setup in cloud environments. All functionality remains identical with excellent performance.

#### Option 1: One-Click Deploy (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ThayalanGR/rustify-hackathon-2025)

#### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option 3: GitHub Integration
1. Push code to GitHub
2. Connect repository to Vercel  
3. Vercel will automatically build and deploy

### Environment Variables

For production, you may want to set:

```bash
# .env.production
VITE_API_URL=https://your-api.com
VITE_ANALYTICS_ID=your-analytics-id
```

## 🔧 Customization

### Adding New Rust Functions

1. **Add function to `rust-core/src/lib.rs`**:
   ```rust
   #[wasm_bindgen]
   pub fn your_function(input: &str) -> JsValue {
       // Your Rust code here
       serde_wasm_bindgen::to_value(&result).unwrap()
   }
   ```

2. **Update TypeScript declarations in `client/src/wasm/rust_core.d.ts`**:
   ```typescript
   export function your_function(input: string): YourResultType;
   ```

3. **Use in Web Worker (`client/src/worker/dataWorker.ts`)**:
   ```typescript
   import { your_function } from '../wasm/rust_core';
   
   // Add to switch statement in worker message handler
   case 'your_function_type':
     result = your_function(data.input);
     break;
   ```

4. **Call from React component**:
   ```typescript
   const response = await sendWorkerMessage({
     type: 'your_function_type',
     data: { input: 'your data' }
   });
   ```

### Styling Customization

The app uses CSS custom properties for easy theming:

```css
/* client/src/App.css */
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  --background-color: #your-color;
}
```

## 📊 Performance Optimization

### Rust/WASM Optimization

```toml
# rust-core/Cargo.toml
[profile.release]
opt-level = "s"          # Optimize for size
lto = true              # Link-time optimization
debug = false           # Remove debug info
panic = "abort"         # Smaller panic handler
```

### Vite Optimization

```typescript
// client/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    }
  }
});
```

## 🐛 Troubleshooting

### Common Issues

#### 1. WASM Build Fails
```bash
# Install Rust targets
rustup target add wasm32-unknown-unknown

# Update wasm-pack
cargo install wasm-pack
```

#### 2. Web Worker Errors
- Ensure your browser supports ES modules in workers
- Check browser console for detailed error messages
- Verify WASM files are properly generated

#### 3. Development Server Issues
```bash
# Clear cache and reinstall
rm -rf client/node_modules client/.vite
cd client && npm install
```

#### 4. TypeScript Errors
```bash
# Regenerate WASM TypeScript bindings
cd rust-core && ./build.sh
```

### Performance Issues

- **Large CSV files**: Use streaming for files >10MB
- **Memory usage**: Monitor browser dev tools
- **Worker communication**: Avoid sending large objects

## 📚 Learn More

### Rust + WebAssembly
- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)

### React + TypeScript
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

### Web Workers
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Comlink Library](https://github.com/GoogleChromeLabs/comlink)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 What's Next?

- [ ] **WebGL Integration**: Add GPU-accelerated visualizations
- [ ] **Streaming Data**: Handle real-time data streams
- [ ] **Multi-threading**: Leverage WASM threads
- [ ] **PWA Features**: Add offline support
- [ ] **Advanced Charts**: 3D visualizations
- [ ] **WebRTC**: Real-time collaboration

---

## 🙏 Acknowledgments

- **Rust Team** for the amazing language and WebAssembly support
- **Vite Team** for the lightning-fast build tool  
- **React Team** for the powerful UI library
- **wasm-bindgen contributors** for seamless Rust-JS interop

---

**Built with ❤️ for the Rust Hackathon – High-Performance Frontiers**

*Happy coding! 🚀*