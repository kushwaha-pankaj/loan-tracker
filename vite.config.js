import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/loan-tracker/',
  server: {
    // App is served under `base`; open this path so the browser doesn’t land on a blank root.
    open: '/loan-tracker/',
  },
})
