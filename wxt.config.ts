import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '网页转 Markdown',
    description: '将当前网页所选区域转为 Markdown，支持复制、下载与历史',
    version: '0.1.0',
    action: {},
    permissions: ['storage', 'tabs', 'sidePanel'],
    host_permissions: ['http://*/*', 'https://*/*'],
  },
  vite: () => ({
    plugins: tailwindcss(),
  }),
});
