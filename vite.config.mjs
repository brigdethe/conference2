import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    root: 'frontend-final',
    base: '/onboarding/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
})
