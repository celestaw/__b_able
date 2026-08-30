import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
