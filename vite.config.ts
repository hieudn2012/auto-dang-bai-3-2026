import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:53200',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        onstart({ startup }) {
          startup()
        },
        vite: {
          build: {
            watch: null,
            rollupOptions: {
              external: [
                'gologin',
                'sharp',
                '@img/sharp-darwin-arm64',
                '@img/sharp-darwin-x64',
                '@img/sharp-linux-arm64',
                '@img/sharp-linux-x64',
                '@img/sharp-win32-arm64',
                '@img/sharp-win32-x64',
                '@img/sharp-wasm32',
                'fs',
                'path',
                'os',
                'crypto',
                'stream',
                'util',
                'buffer',
                'events',
                'assert',
                'constants',
                'querystring',
                'url',
                'http',
                'https',
                'zlib',
                'tty',
                'net',
                'child_process',
                'cluster',
                'dgram',
                'dns',
                'domain',
                'module',
                'punycode',
                'readline',
                'repl',
                'string_decoder',
                'sys',
                'timers',
                'tls',
                'tty',
                'v8',
                'vm',
                'worker_threads'
              ],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@electron': path.resolve(__dirname, 'electron'),
    },
  },
})
