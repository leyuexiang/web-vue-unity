import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  // 二维配置中的动态图标与正式构建使用同一解析器，测试不伪造组件注册表。
  plugins: [vue(), Icons({ autoInstall: false })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['./src/test/vitest.setup.ts'],
    testTimeout: 30000,
  },
})
