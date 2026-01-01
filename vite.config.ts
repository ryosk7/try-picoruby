import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Plugin to inject WASM file names
const wasmFilePlugin = () => {
  return {
    name: 'wasm-file-plugin',
    generateBundle(options: any, bundle: any) {
      // Find WASM files in the bundle
      const wasmFiles: Record<string, string> = {}

      for (const fileName in bundle) {
        const chunk = bundle[fileName]
        if (fileName.endsWith('.wasm')) {
          // Extract the base name without hash
          const baseName = fileName.split('-')[0] + '.wasm'
          wasmFiles[baseName] = fileName

          // Also add without assets/ prefix for easier lookup
          const bareBaseName = baseName.replace('assets/', '')
          wasmFiles[bareBaseName] = fileName
        }
      }

      // Create a virtual module with the WASM file mappings
      this.emitFile({
        type: 'asset',
        fileName: 'wasm-manifest.json',
        source: JSON.stringify(wasmFiles)
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), wasmFilePlugin()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    include: ['rp2040js'],
    exclude: ['@picoruby/wasm-wasi']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Remove external declaration for WASM file to let Vite handle it
      output: {
        // Ensure WASM files keep their original names for easier resolution
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    fs: {
      allow: ['..'] // Allow serving files from node_modules
    },
    // Configure WASM MIME type
    configure: (server) => {
      server.middlewares.use('/wasm', (req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    }
  },
  // Define alias to help with WASM resolution in development
  resolve: {
    alias: {
      '@picoruby-wasm': resolve(__dirname, 'node_modules/@picoruby/wasm-wasi/dist')
    }
  }
})