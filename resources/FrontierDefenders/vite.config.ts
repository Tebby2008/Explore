import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' allows the app to work in any subdirectory (like /repo-name/)
  base: '/Explore/FrontierDefense', 
})