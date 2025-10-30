# 🚀 Deployment Guide

## Quick Deploy to Vercel

### Option 1: One-Click Deploy (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lumelinc/rustify-hackathon-2025)

Click the button above to deploy directly to Vercel.

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd rustify-hackathon-2025
vercel --prod
```

### Option 3: GitHub Integration
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import `lumelinc/rustify-hackathon-2025`
5. Configure build settings (auto-detected from vercel.json)
6. Deploy!

## Build Configuration

The project includes a `vercel.json` file with optimal settings:

```json
{
  "buildCommand": "chmod +x ./build.sh && ./build.sh && cd client && npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "cd client && npm install"
}
```

## Environment Variables (Optional)

For production, you can set these in Vercel dashboard:

- `NODE_VERSION` → `20.x` (recommended)
- `RUST_VERSION` → `stable` (if using custom build)

## Post-Deployment

After deployment:
1. ✅ Test the application functionality
2. ✅ Verify WASM loading (or JS fallback)
3. ✅ Test CSV upload and processing
4. ✅ Check mobile responsiveness
5. ✅ Monitor performance metrics

## Troubleshooting

### Build Issues
- Ensure Node.js 20+ is used in Vercel settings
- Check build logs for specific errors
- WASM build failures are handled gracefully with JS fallbacks

### Performance
- The app includes performance monitoring
- WASM provides significant speed improvements for data processing
- Web Workers prevent UI blocking during computations

---

**Live Demo:** Will be available after deployment at `https://your-app-name.vercel.app`