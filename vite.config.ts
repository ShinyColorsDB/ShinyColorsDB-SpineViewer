import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
      dts: true,
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 100 * 1024, // 100KB
          groups: [
            {
              name: 'naive-ui',
              test: /[\\/]node_modules[\\/]naive-ui[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.shinycolors.moe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/spine'),
      },
      '/cf': {
        target: 'https://cf-static.shinycolors.moe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cf/, ''),
      },
      '/spine': {
        target: 'https://cf-static.shinycolors.moe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spine/, '/spine'),
      },
    },
  },
})
