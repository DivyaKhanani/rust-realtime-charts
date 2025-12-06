#!/usr/bin/env node

/**
 * Cross-platform WASM build script
 * Works on Windows, macOS, and Linux
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const rustCoreDir = path.resolve(__dirname, './rust-core');

console.log('🦀 Building Rust WebAssembly module...\n');

// Check if wasm-pack is installed
const checkWasmPack = () => {
  return new Promise((resolve) => {
    const cmd = isWindows ? 'where' : 'which';
    const check = spawn(cmd, ['wasm-pack'], { shell: true });
    
    check.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ wasm-pack is not installed.');
        console.error('Please install it with:');
        console.error('  cargo install wasm-pack');
        console.error('  OR visit: https://rustwasm.github.io/wasm-pack/installer/');
        process.exit(1);
      }
      resolve();
    });
  });
};

// Build WASM
const buildWasm = () => {
  return new Promise((resolve, reject) => {
    console.log('🔨 Running wasm-pack build...');
    
    const args = [
      'build',
      '--target', 'web',
      '--out-dir', './client/src/wasm/package',
      '--release'
    ];
    
    const build = spawn('wasm-pack', args, {
      cwd: rustCoreDir,
      shell: true,
      stdio: 'inherit'
    });
    
    build.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ WASM build failed');
        reject(new Error('Build failed'));
        return;
      }
      resolve();
    });
  });
};

// Copy files to public/pkg
const copyToPublic = () => {
  console.log('📦 Copying WASM to public/pkg...');
  
  const srcDir = path.resolve(__dirname, './client/src/wasm/package');
  const destDir = path.resolve(__dirname, './client/public/pkg');
  
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`   Created ${destDir}`);
  }
  
  // Copy files
  const files = ['rw_lttb_bg.wasm', 'rw_lttb.js'];
  let copiedCount = 0;
  
  files.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`   ✓ Copied ${file}`);
      copiedCount++;
    } else {
      console.error(`   ❌ File not found: ${src}`);
    }
  });
  
  if (copiedCount === files.length) {
    console.log(`   ✅ All ${copiedCount} files copied successfully`);
  } else {
    console.warn(`   ⚠️  Only ${copiedCount}/${files.length} files copied`);
  }
  
  // Verify the files exist in destination
  console.log('\n📋 Verifying files in public/pkg:');
  files.forEach(file => {
    const dest = path.join(destDir, file);
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.error(`   ❌ ${file} NOT FOUND`);
    }
  });
};

// Main execution
(async () => {
  try {
    await checkWasmPack();
    await buildWasm();
    copyToPublic();
    
    console.log('\n✅ WASM build complete!');
    console.log('📦 Generated files in:');
    console.log('   - client/src/wasm/package/ (for bundler import)');
    console.log('   - client/public/pkg/ (for worker direct import)');
    console.log('\n🎉 Ready to use in your React application!');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
})();
