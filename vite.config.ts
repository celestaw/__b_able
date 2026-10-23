import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Vite 5 と同じブラウザ対応範囲を維持する。
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  server: {
    // LAN に公開する。別端末（Mac 等）から Windows 機の IP:5173 でアクセスできる。
    host: true,
    watch: {
      // ソース外の資料フォルダ。別アプリで開かれてロックされると
      // ファイル監視が EBUSY で落ちて dev サーバごと死ぬので監視対象から外す。
      ignored: ['**/presen/**'],
    },
  },
})
